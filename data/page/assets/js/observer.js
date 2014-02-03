(function() {
    'use strict';

    // regex to match dutch phone numbers
    var phoneRegex = /((\+31|00\s*31|0)\s*(\(0\))*)([-\s\.\(])*(([1-7]([-\s\.\)])*\d)|(8[58]))([-\s\.\)])*\d([-\s\.\)])*\d([-\s\.])*\d([-\s\.])*\d([-\s\.])*\d([-\s\.])*\d([-\s\.])*\d/g;

    // regex to match simple date format
    var dateRegex = /\d{2}-\d{2}-\d{4} \d{2}/g;

    // only look for phone numbers in child nodes of the following tags
    var selector = [
        "a", "abbr", "acronym", "address", "applet", "b", "bdo", "big", "blockquote", "body", "caption", "center",
        "cite", "dd", "del", "div", "dfn", "dt", "em", "fieldset", "font", "form", "h1", "h2", "h3", "h4",
        "h5", "h6", "i", "iframe", "ins", "kdb", "li", "nobr", "object", "p", "q", "samp", "small", "span",
        "strike", "s", "strong", "sub", "sup", "td", "th", "tt", "u", "var", "article", "aside", "bdi", "command",
        "datalist", "details", "embed", "figure", "figcaption", "footer", "header", "hgroup", "keygen", "mark",
        "meter", "nav", "outpuFt", "progress", "rp", "ruby", "rt", "section", "summary", "time", "wbr"
    ].join(',');

    // identify our elements with these class names
    var phoneElementClassName = 'voipgrid-phone-number';
    var phoneIconClassName = 'voipgrid-phone-icon';

    // element that shows the icon and triggers a call
    var iconStyle = {
        'background-attachment': 'scroll',
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
        'width': '18px !important',
    };

    // this icon will be cloned and slightly modified every time a phone number needs a new icon
    var icon = $('<a href="javascript:;">').addClass(phoneIconClassName)
        .attr('style', (function() {
            // cannot set !important with .css("property", "value !important"),
            // so build a string to use as style
            var style = '';
            for(var property in iconStyle) {
                style += property + ': ' + iconStyle[property] +'; ';
            }
            return style;
        }()));

    // this style's intention is to hide the icons when printing
    var printStyle = $('<link rel="stylesheet" href="' + chrome.runtime.getURL('data/page/assets/css/print.css') + '" media="print">');

    /**
     * Find elements that match our regex for a dutch phone number and
     * don't already have an icon next to them using *findAndReplaceDOMText*.
     */
    function insertIconsIntoElement(element) {
        findAndReplaceDOMText(element, {
            find: phoneRegex,
            replace: function(portion, match, matchIndex) {
                // insert the icon after the phone number
                var newIcon = icon.clone();
                newIcon.attr('data-number', match[0]);
                return $('<span>').addClass(phoneElementClassName).html(match[0] + $('<div>').append(newIcon).html())[0];
            },
            filterElements: function(element) {
                return !$(element).hasClass(phoneElementClassName);
            }
        });
    }

    /**
     * Observer: search and insert icons after mutations.
     */
    var observer = new MutationObserver(function(mutations) {
        $.each(mutations, function(index, mutation) {
            insertIconsIntoElement(mutation.target);
        });
    });

    /**
     * Observer: start.
     */
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request == 'page.observer.start') {
                console.info('page.observer.start');

                // inject our print stylesheet
                $('head').append(printStyle);

                // only search the body element
                if($('body').length) {
                    // process the DOM 'as is'
                    insertIconsIntoElement($('body')[0]);

                    // now also process mutations
                    if(observer) {
                        observer.observe($('body')[0], {
                            characterData: true,
                            childList: true,
                            subtree: true,
                        });
                    }
                }
            }
        });

    /**
     * Observer: stop.
     */
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request == 'page.observer.stop') {
                console.info('page.observer.stop');

                if(observer) {
                    // stop processing mutations
                    observer.disconnect();
                }

                // remove icons from page
                var iconElements = $('.'+phoneIconClassName);
                $(iconElements).remove();

                // remove our CSS class from previously identified elements containing phone numbers
                var phoneElements = $('.'+phoneElementClassName);
                $(phoneElements).contents().unwrap();

                // remove our stylesheet
                $(printStyle).remove();
            }
        });

    // signal this script has been loaded and ready to look for phone numbers
    chrome.runtime.sendMessage('page.observer.ready');
})();
