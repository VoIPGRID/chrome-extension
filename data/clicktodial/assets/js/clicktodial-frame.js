(function() {
    'use strict';

    var callid = window.location.href.match(/callid\=([^&]+)/)[1];

    function setText(element, text) {
        while(element.firstChild !== null) {
            element.removeChild(element.firstChild); // remove all existing content
        }
        element.appendChild(document.createTextNode(text));
    }

    window.addEventListener('message', function(e) {
        if(e.data.hasOwnProperty('clicktodial.b_number')) {
            if(e.data['clicktodial.b_number'].callid == callid) {
                console.info('clicktodial.b_number');

                var number = e.data['clicktodial.b_number'].b_number;
                var numberElement = document.getElementById('number');
                setText(numberElement, number);
            }
        } else if(e.data.hasOwnProperty('clicktodial.status')) {
            if(e.data['clicktodial.status'].callid == callid) {
                console.info('clicktodial.status');

                var status = e.data['clicktodial.status'].status;
                if(status) {
                    var statusElement = document.getElementById('status');
                    setText(statusElement, status);
                }
            }
        }
    });

    var hidePanel = function() {
        // stop the call status timer
        chrome.runtime.sendMessage({'clicktodialpanel.onhide': {
            // extra info to identify call
            callid: callid
        }});

        // close this frame
        parent.postMessage('clicktodialpanel.onhide' + callid, '*');

        return false;
    };

    document.addEventListener('DOMContentLoaded', function() {
        var closeButton = document.getElementById('close');
        closeButton.onclick = hidePanel;
    }, false);

    window.addEventListener('unload', hidePanel, false);

    // start doing things with this panel
    chrome.runtime.sendMessage({'clicktodialpanel.onshow': {
        // extra info to identify call
        callid: callid
    }});
})();
