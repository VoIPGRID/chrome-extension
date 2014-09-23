(function() {
    'use strict';

    /**
     * SIP Module.
     *
     * Implements the SIPml5 library.
     */

    var sipStack,
        status,
        subscriptions,
        states;

    window.SIP = (function() {
        var init = function(options) {
            console.info('SIP.init');

            var eventsListener = function(e) {
                status = e.type;
                if(e.type == 'started') {
                    if(options.connected) {
                       options.connected();
                    }
                }
            };

            if(sipStack) {
                stop();
                sipStack = undefined;
            }

            // create sipStack
            sipStack = new SIPml.Stack({
                realm: options.realm, // mandatory: domain name
                impi: options.impi, // mandatory: authorization name (IMS Private Identity)
                impu: options.impu, // mandatory: valid SIP Uri (IMS Public Identity)
                password: options.password, // optional
                display_name: options.display_name, // optional
                websocket_proxy_url: options.websocket_proxy_url, // optional
                // outbound_proxy_url: 'udp://example.org:5060', // optional
                enable_rtcweb_breaker: false, // optiona
                events_listener: { events: '*', listener: eventsListener }, // optional: '*' means all events
                sip_headers: [ // optional
                        { name: 'User-Agent', value: 'Chrome add-on/sipML5' },
                        { name: 'Organization', value: 'VoIPGRID' }
                    ]
            });
        };

        var start = function() {
            if((!status || status == 'stopped') && sipStack) {
                console.info('SIP.start');
                subscriptions = {};
                states = {};
                sipStack.start();
            }
        };

        var stop = function() {
            if(status && status == 'started') {
                console.info('SIP.stop');

                if(subscriptions) {
                    $.each(subscriptions, function(from) {
                        unsubscribe(from);
                    });
                }
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
                    // console.info('session event = ' + e.type);
                    if(e.getContentType() == 'application/dialog-info+xml') {
                        if(window.DOMParser) {
                            var parser = new DOMParser();
                            var xmlDoc = parser ? parser.parseFromString(e.getContentString(), 'text/xml') : null;

                            var dialogNode = xmlDoc ? xmlDoc.getElementsByTagName('dialog-info')[0] : null;
                            if(dialogNode){
                                var entityUri = dialogNode.getAttribute('entity');
                                var stateAttr = dialogNode.getAttribute('state');
                                var localNode = dialogNode.getElementsByTagName('local')[0];
                                var stateNode = dialogNode.getElementsByTagName('state')[0];

                                var state = 'unavailable';
                                if(stateAttr == 'full') {
                                    // available
                                    state = 'available';
                                }

                                // state node has final say, regardless of stateAttr!
                                if(stateAttr == 'partial') {
                                    if(stateNode) {
                                        switch(stateNode.textContent) {
                                            case 'trying':
                                            case 'proceeding':
                                            case 'early':
                                                state = 'ringing';
                                                break;
                                            case 'confirmed':
                                                state = 'busy';
                                                break;
                                            case 'terminated':
                                                state = 'available';
                                                break;
                                        }
                                    }
                                }

                                // broadcast presence for account
                                chrome.runtime.sendMessage({'contacts.sip': {
                                    'impu': entityUri,
                                    'state': state,
                                }});
                                // remember subscribed accounts and its state at the time of an update
                                states[entityUri] = {
                                    state: state,
                                };
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
                delete states[from];
                console.info('SIP unsubscribed from', from);
            } else {
                console.info('SIP not unsubscribed from', from);
            }
        };

        var refresh = function() {
            console.info('SIP.refresh');

            if(states) {
                $.each(states, function(entityUri) {
                    // broadcast presence for account
                    chrome.runtime.sendMessage({'contacts.sip': {
                        'impu': entityUri,
                        'state': states[entityUri].state,
                    }});
                });
            }
        };

        return {
            init: init,
            start: start,
            stop: stop,
            refresh: refresh,
            subscribe: subscribe,
            unsubscribe: unsubscribe,
        };
    })();
})();
