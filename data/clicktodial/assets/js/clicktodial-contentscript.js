(function() {
    'use strict';

    var iframes = {};

    function showClickToDialPanel(callid) {
        var iframeStyle = {
            // positional CSS
            'position': 'absolute',
            'margin': 'auto',
            'top': '0',
            'right': '0',
            'bottom': '0',
            'left': '0',
            'width': '300px',
            'height': '79px',
            'z-index': '2147483647',

            // pretty styling
            'border': 'none',
            'border-radius': '5px',
            'box-shadow': 'rgba(0,0,0,0.25) 0 0 0 2038px, rgba(0,0,0,0.25) 0 10px 20px',
        };
        iframes[callid] = $('<iframe>', {
            src: chrome.runtime.getURL('data/clicktodial/html/clicktodial.html?callid=' + callid),
            style: (function() {
                // cannot set !important with .css("property", "value !important"),
                // so build a string to use as style
                var style = '';
                for(var property in iframeStyle) {
                    style += property + ': ' + iframeStyle[property] +' !important; ';
                }
                return style;
            }()),
            scrolling: false,
        });

        $(iframes[callid]).hide();
        $(iframes[callid]).load(function() {
            $(iframes[callid]).show();

            // start doing things with this panel
            chrome.runtime.sendMessage({'clicktodialpanel.onshow': {
                // extra info to identify call
                callid: callid
            }});
        });
        $('html').append(iframes[callid]);

        addEventListener('message', function(e) {
            if(e.data === 'clicktodialpanel.onhide' + callid) {
                // remove iframe displaying status for given callid
                $(iframes[callid]).remove();
                delete iframes[callid];
            }
        });
    }

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request.hasOwnProperty('clicktodialpanel.show')) {
                console.info('clicktodialpanel.show');

                var callid = request['clicktodialpanel.show'].callid;
                showClickToDialPanel(callid);
            } else {
                // pass request to correct iframe
                var callid = null;
                if(request.hasOwnProperty('clicktodial.b_number')) {
                    callid = request['clicktodial.b_number'].callid;
                } else if(request.hasOwnProperty('clicktodial.status')) {
                    callid = request['clicktodial.status'].callid;
                }
                if(callid) {
                    var iframe = iframes[callid];
                    if(iframe && iframe.length && iframe[0].contentWindow) {
                        iframe[0].contentWindow.postMessage(request, '*');
                    }
                }
            }
        });
})();
