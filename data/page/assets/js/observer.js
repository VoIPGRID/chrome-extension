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
            'background-image': 'url("' + chrome.runtime.getURL('data/clicktodial/assets/img/clicktodial.png') + '")',
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

    var ctdNode = (function() {
        var ctd = document.createElement('ctd');
        ctd.setAttribute('style', 'font-style: inherit; font-family: inherit;');
        ctd.classList.add(phoneElementClassName);

        return ctd;
    })();

    // element that shows the icon and triggers a call
    var iconElement = (function() {
        var a = document.createElement('a');
        a.setAttribute('style', iconStyle);
        a.classList.add(phoneIconClassName);

        return a;
    })();

    /**
     * Create an HTML element containing an anchor with a phone icon with
     * the phone number in a data attribute.
     */
    function createNumberIconElement(number) {
        var icon = iconElement.cloneNode(false);
        // add properties unique for "number"
        icon.setAttribute('data-number', number);
        icon.href = 'javascript:clicktodial(' + number + ')';

        // wrap in element so ".innerHTML" contains the icon HTML
        var wrapper = document.createElement('p');
        wrapper.appendChild(icon);
        return wrapper;
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
        var childrenLength = $(root).find('*').length;  // no lookup costs
        if(childrenLength < 2001) {
            if(debug) console.log('scanning ' + childrenLength + ' elements');

            walkTheDOM(root, function(node) {
                var curNode = node;

                // scan using every available parser
                window.parsers.forEach(function(localeParser) {
                    var parser = localeParser[1]();

                    // transform Text node to HTML-capable node, to
                    // - deal with html-entities (&nbsp;, &lt;, etc.) since
                    // they mess up the start/end from
                    // matches when reading from node.data, and
                    // - enable inserting the icon html (doesn't work with a text node)
                    var replacementNode = ctdNode.cloneNode(false);
                    replacementNode.textContent = node.data;
                    replacementNode.innerHTML = escapeHTML(node.data);;

                    var matches = parser.parse(replacementNode.innerHTML);
                    if(matches.length) {
                        if(!parser.isBlockingNode(curNode.previousElementSibling) &&
                                !parser.isBlockingNode(curNode.parentNode.previousElementSibling)) {

                            matches.reverse().forEach(function(match) {
                                var numberIconElement = createNumberIconElement(match.number);

                                // prefix icon with match (==number)
                                var originalText = replacementNode.innerHTML.slice(match.start, match.end);
                                numberIconElement.innerHTML = originalText + ' ' + numberIconElement.innerHTML;

                                var before = replacementNode.innerHTML.slice(0, match.start);
                                var after = replacementNode.innerHTML.slice(match.end);
                                replacementNode.innerHTML = before + numberIconElement.innerHTML + after;
                            });

                            node.parentNode.insertBefore(replacementNode, node);
                            node.parentNode.removeChild(node);
                        }
                    }
                });
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
                var stillInDocument = document.contains(node); // no lookup costs
                if(stillInDocument) {
                    var before = new Date().getTime();
                    doInsert(node);
                    if(debug) console.log('doInsert (handleMutations) took', new Date().getTime() - before);
                } else {
                    if(debug) console.log('doInsert (handleMutations) took 0 - removed node');
                }
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
        // fill the contact list
        if(response && response.hasOwnProperty('observe')) {
            var observe = response.observe;

            if (!observe) {
                return;
            }

            if(debug) {
                console.info('page.observer.ready', window.location.href);
            }

            var doRun = function() {
                if(debug) {
                    console.info('page.observer.start');
                }

                // inject our print stylesheet
                $('head').append(printStyle);

                // insert icons
                var before = new Date().getTime();
                doInsert();
                if(debug) console.log('doInsert (doRun) took', new Date().getTime() - before);

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
        }
    });
})();
