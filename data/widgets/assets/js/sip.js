(function() {
    'use strict';

    /**
     * SIP Module.
     *
     * Implements the SIPml5 library.
     */

    var sipStack,
        status,
        subscriptions = {};

    window.SIP = (function() {
        var init = function(callbacks) {
            console.info('SIP.init');

            var eventsListener = function(e) {
                status = e.type;
                if(e.type == 'started') {
                    if(callbacks.connected) {
                       callbacks.connected();
                    }
                }
            };

            // createSipStack
            sipStack = new SIPml.Stack({
                realm: window.SIPconfig['realm'], // mandatory: domain name
                impi: window.SIPconfig['impi'], // mandatory: authorization name (IMS Private Identity)
                impu: window.SIPconfig['impu'], // mandatory: valid SIP Uri (IMS Public Identity)
                password:window.SIPconfig['pass'], // optional
                display_name: window.SIPconfig['display_name'], // optional
                websocket_proxy_url: 'ws://websocket.test.voipgrid.nl:80', // optional
                // outbound_proxy_url: 'udp://example.org:5060', // optional
                enable_rtcweb_breaker: false, // optiona
                events_listener: { events: '*', listener: eventsListener }, // optional: '*' means all events
                sip_headers: [ // optional
                        { name: 'User-Agent', value: 'Firefox add-on/sipML5' },
                        { name: 'Organization', value: 'VoIPGRID' }
                    ]
            });
        };

        var start = function() {
            console.info('SIP.start');
            if(!status || status == 'stopped') {
                sipStack.start();
            }
        };

        var stop = function() {
            console.info('SIP.stop');
            if(status && status == 'started') {
                sipStack.stop();
            }
        };

        var subscribe = function(to, presenceCallback) {
            console.info('SIP.subscribe');

            if(subscriptions.hasOwnProperty(to)) {
                console.info('SIP already subscribed to ', to);
            } else {
                var subscribeSession;
                subscriptions[to] = subscribeSession;  // keep reference to prevent subscribing multiple times

                var eventsListener = function(e){
                    console.info('session event = ' + e.type);
                    if (e.getContentType() == 'application/dialog-info+xml') {
                        if (window.DOMParser) {
                            var parser = new DOMParser();
                            var xmlDoc = parser ? parser.parseFromString(e.getContentString(), "text/xml") : null;

                            var dialogNode = xmlDoc ? xmlDoc.getElementsByTagName ("dialog-info")[0] : null;
                            if(dialogNode){
                                var entityUri = dialogNode.getAttribute ("entity");
                                var stateAttr = dialogNode.getAttribute ("state");
                                var localNode = dialogNode.getElementsByTagName ("local")[0];
                                var stateNode = dialogNode.getElementsByTagName ("state")[0];

                                var status = 'unavailable';
                                if(stateAttr == 'full') {
                                    // available
                                    status = 'available';
                                } else if(stateAttr == 'partial') {
                                    if(stateNode) {
                                        switch(stateNode.textContent) {
                                            case 'trying':
                                            case 'proceeding':
                                            case 'early':
                                                status = 'ringing';
                                                break;
                                            case 'confirmed':
                                                status = 'busy';
                                                break;
                                            case 'terminated':
                                                status = 'available';
                                                break;
                                        }
                                    }
                                } else {
                                    // unavailable
                                }

                                presenceCallback(entityUri, status);
                            }
                        }
                    }
                };
                var subscribePresence = function(to) {
                    subscribeSession = sipStack.newSession('subscribe', {
                            expires: 200,
                            events_listener: { events: '*', listener: eventsListener },
                            sip_headers: [
                                    { name: 'Event', value: 'dialog' },  // only notify for 'dialog' events
                                    { name: 'Accept', value: 'application/dialog-info+xml' } // subscribe to dialog-info
                                ],
                            sip_caps: [
                                    { name: '+g.oma.sip-im', value: null },
                                    { name: '+audio', value: null },
                                    { name: 'language', value: '\"en\"' }
                                ]
                        });

                    // start watching for entity's presence status (You may track event type 'connected' to be sure that the request has been accepted by the server)
                    subscribeSession.subscribe(to);
                    subscriptions[to] = subscribeSession;  // update reference to enable unsubscribe
                };
                subscribePresence(to);
            }
        };

        var unsubscribe = function(from) {
            console.info('SIP.unsubscribe');

            if(subscriptions.hasOwnProperty(from)) { // && subscriptions[from]) {
                subscriptions[from].unsubscribe();
                delete subscriptions[from];
                console.info('SIP unsubscribed from', from);
            } else {
                console.info('SIP not unsubscribed from', from);
            }
        };

        return {
            init: init,
            start: start,
            stop: stop,
            subscribe: subscribe,
            unsubscribe: unsubscribe,
        };
    })();
})();
