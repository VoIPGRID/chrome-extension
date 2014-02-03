(function() {
    'use strict';

    var debug = false;

    /**
     * Escape HTML chars when assigning text to innerHTML.
     */
    escapeHTML.replacements = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };
    function escapeHTML(str) {
        return str.replace(/[&"<>]/g, function (m) {
                return escapeHTML.replacements[m];
            }
        );
    }

    // identify our elements with these class names
    var phoneElementClassName = 'voipgrid-phone-number';
    var phoneIconClassName = 'voipgrid-phone-icon';

    var iconStyle = (function() {
        // cannot set !important with `.css("property", "value !important"),`
        // so build a string to use as style
        var iconStyle = {
            // 'background-attachment': 'scroll',  // this is set later, conditionally
            'background-color': 'transparent !important',
            'background-image': 'url(' + chrome.runtime.getURL('data/clicktodial/assets/img/clicktodial.png') + ')',
            'background-repeat': 'no-repeat',
            'bottom': '-3px !important',
            'background-position': 'center center',
            '-moz-border-radius': '9px !important',
            'border-radius': '9px !important',
            '-moz-box-shadow': '0 1px 1px rgba(0, 0, 0, 0.2) !important',
            'box-shadow': '0 1px 1px rgba(0, 0, 0, 0.2) !important',
            'display': 'inline-block',
            'height': '18px !important',
            'margin': '0 4px !important',
            'line-height': '18px !important',
            'padding': '0 !important',
            'position': 'relative !important',
            'width': '18px !important'
        };
        var style = '';
        for(var property in iconStyle) {
            style += property + ': ' + iconStyle[property] +'; ';
        }
        return style;
    })();

    // this style's intention is to hide the icons when printing
    var printStyle = $('<link rel="stylesheet" href="' + chrome.runtime.getURL('data/page/assets/css/print.css') + '" media="print">');

    /**
     * Create an HTML element containing an anchor with a phone icon with
     * the phone number in a data attribute.
     */
    function createIconElement(number) {
        function newIcon(number) {
            // element that shows the icon and triggers a call
            return $('<a>', {
                'href': 'javascript:clicktodial(' + number + ')',
                'data-number': number,
                'class': phoneIconClassName,
                'style': iconStyle,
            });
        }

        // create element which is display:inline with an icon in it,
        // identified by phoneElementClassName
        return $('<ctd>', {
            'class': phoneElementClassName,
            'style': 'font-style: inherit; font-family: inherit',
        }).html($('<div>').append(newIcon(number)).html())[0];
    }

    /**
     * Click event handler: dial the number in the attribute `data-number`.
     */
    $('body').on('click', '.'+phoneIconClassName, function(event) {
        if($(this).attr('data-number') && $(this).parents('.'+phoneElementClassName).length) {
            // remove focus
            $(this).blur();

            // don't do anything with this click in the actual page
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            // dial
            var b_number = $(this).attr('data-number');
            chrome.runtime.sendMessage({'clicktodial.dial': {'b_number': b_number}});
        }
    });

    /**
     * Click event handler: dial the number in the attribute `href`.
     */
    $('body').on('click', '[href^="tel:"]', function(event) {
        // remove focus
        $(this).blur();

        // don't do anything with this click in the actual page
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // dial
        var b_number = $(this).attr('href').substring(4);
        chrome.runtime.sendMessage({'clicktodial.dial': {'b_number': b_number}});
    });

    function doInsert(root) {
        var pause = !!root;

        if(pause) {
            stop_observer();
        }

        root = root || document.body;

        // walk the DOM looking for elements to parse
        // but block reasonably sized pages to prevent locking the page
        var childrenLength = $(root).find('*').length;
        if(childrenLength < 2001) {
            if(debug) console.log('scanning ' + childrenLength + ' elements');

            walkTheDOM(root, function(node) {
                var curNode = node;

                // is it a Text node?
                if(node.nodeType === 3) {
                    // does it have non whitespace text content?
                    var text = node.data.trim();
                    if(text.length > 0) {

                        // scan using every available parser
                        window.parsers.forEach(function(localeParser) {
                            var matches = [];
                            var parser = localeParser[1]();

                            // transform Text node to HTML-capable node, to
                            // - deal with html-entities (&nbsp;, &lt;, etc.) since
                            // they mess up the start/end from
                            // matches when reading from node.data, and
                            // - enable inserting the icon html (doesn't work with a text node)
                            var replacementNode = $('<ctd style="font-style: inherit; font-family: inherit;">')[0];
                            replacementNode.textContent = node.data;
                            replacementNode.innerHTML = escapeHTML(node.data);

                            matches = parser.parse(replacementNode.innerHTML);

                            // insert icons after every phone number
                            if(matches.length) {
                                if(!parser.isBlockingNode(curNode.previousElementSibling) &&
                                        !parser.isBlockingNode(curNode.parentNode.previousElementSibling)) {

                                    // loop backwards to make indexes work
                                    matches.reverse().forEach(function(match) {
                                        var iconElement = createIconElement(match.number);
                                        var originalText = replacementNode.innerHTML.slice(match.start, match.end);
                                        iconElement.innerHTML = originalText + ' ' + iconElement.innerHTML;

                                        var number_and_icon = $('<ctd style="font-style: inherit; font-family: inherit;">').append($(iconElement)).html();
                                        var before = replacementNode.innerHTML.slice(0, match.start);
                                        var after = replacementNode.innerHTML.slice(match.end);
                                        replacementNode.innerHTML = before + number_and_icon + after;
                                    });

                                    node.parentNode.insertBefore(replacementNode, node);
                                    node.parentNode.removeChild(node);
                                    curNode = replacementNode;
                                }
                            }
                        });
                    }
                }
                return curNode;
            });
        } else {
            if(debug) console.log('not scanning ' + childrenLength + ' elements');
        }

        if(pause) {
            start_observer();
        }
    }

    function undoInsert() {
        // remove icons from page
        $('.'+phoneIconClassName).remove();

        // unwrap previously identified elements from their 'iconElement'
        $('.'+phoneElementClassName).each(function(index, element) {
            $(element.parentElement).html($(element).html());
        });
    }

    /**
     * Observer: search and insert icons after mutations.
     */
    var observer;
    var parkedNodes = [];
    var handleMutationsTimeout;

    /**
     * Process parked DOM mutations.
     */
    function handleMutations() {
        // copy and clear parkedNodes
        var _parkedNodes = parkedNodes.slice();
        parkedNodes = [];

        // handle mutations if it probably isn't too much to handle
        // (current limit is totally random)
        if(_parkedNodes.length < 151) {
            if(debug) console.log('Processing ' + _parkedNodes.length + ' parked nodes.');
            _parkedNodes.forEach(function(node) {
                doInsert(node);
            });
        } else {
            if(debug) console.log('Too many parked nodes (' + _parkedNodes.length + ').');
        }
    }

    /**
     * Observer start: listen for DOM mutations and let `handleMutations`
     * process them.
     */
    function start_observer() {
        if(!observer) {
            observer = new MutationObserver(function(mutations) {
                if(handleMutationsTimeout) {
                    // don't handle the mutations yet after all
                    clearTimeout(handleMutationsTimeout);
                }

                mutations.forEach(function(mutation) {
                    // filter mutations to park
                    if(mutation.addedNodes.length) {
                        $.each(mutation.addedNodes, function(index, addedNode) {
                            if(!skipNode(addedNode)) {
                                parkedNodes.push(addedNode);
                            }
                        });
                    } else if(!mutation.removedNodes.length && mutation.target) {
                        if(!skipNode(mutation.target)) {
                            parkedNodes.push(mutation.target);
                        }
                    }
                });

                // assuming nothing happens, scan the nodes in 500 ms - after
                // this the page should've been done dealing with the mutations
                if(parkedNodes.length) {
                    handleMutationsTimeout = setTimeout(handleMutations, 500);
                }
            });
        }

        if(observer) {
            observer.observe(document.body, {
                // characterData: true,
                childList: true,
                subtree: true,
            });
        }
    }

    /**
     * Observer stop: simply stop listening to DOM mutations.
     */
    function stop_observer() {
        if(observer) {
            observer.disconnect();
        }
    }
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request == 'page.observer.stop') {
                console.info('page.observer.stop');

                // stop listening to DOM mutations
                stop_observer();

                // remove icons
                undoInsert();

                // remove our stylesheet
                $(printStyle).remove();
            }
        });

    // signal this script has been loaded and ready to look for phone numbers
    chrome.runtime.sendMessage('page.observer.ready', function(response) {
        if(debug) {
            console.info('page.observer.ready', window.location.href);
        } else {
            console.info('page.observer.ready');
        }

        var doRun = function() {
            console.info('page.observer.start');

            // inject our print stylesheet
            $('head').append(printStyle);

            // insert icons
            doInsert();

            // start listening to DOM mutations
            start_observer();
        };

        if(window != window.top && !(document.body.offsetWidth > 0 || document.body.offsetHeight > 0)) {
            // this hidden iframe might become visible, wait for this to happen
            $(window).on('resize', function() {
                doRun();

                // no reason to wait for more resize events
                $(window).off('resize');
            });
        } else {
            doRun();
        }
    });
})();
