(function() {
    'use strict';

    /**
     * SIP Module.
     *
     * Implements the SIPml5 library.
     */

    var code,
        lastEvent,
        sipStack,
        states,
        status,
        subscriptions,
        stopCallback;

    window.SIP = (function() {
        var init = function(options) {
            console.info('SIP.init');

            var eventsListener = function(e) {
                if([
                   // tsip_event_code_e.STACK_STOPPING,
                   tsip_event_code_e.STACK_FAILED_TO_STOP,
                   tsip_event_code_e.STACK_STOPPED,
                ].indexOf(e.o_event.i_code) < 0) {
                    lastEvent = e;
                }

                code = e.o_event.i_code;
                status = e.type;
                switch(code) {
                    case tsip_event_code_e.STACK_STARTING:
                        if(typeof options.callbacks.starting == 'function') {
                            options.callbacks.starting();
                        }
                        break;
                    case tsip_event_code_e.STACK_FAILED_TO_START:
                        if(typeof options.failed_to_start.started == 'function') {
                            options.callbacks.failed_to_start();
                        }
                        break;
                    case tsip_event_code_e.STACK_STARTED:
                        if(typeof options.callbacks.started == 'function') {
                            options.callbacks.started();
                        }
                        break;
                    case tsip_event_code_e.STACK_STOPPED:
                        if(lastEvent) {
                            if(lastEvent.o_event.o_stack.network.o_transport.stop) {
                                lastEvent.o_event.o_stack.network.o_transport.stop();
                            }
                            lastEvent = undefined;
                        }

                        if(typeof options.callbacks.stopped == 'function') {
                            options.callbacks.stopped();
                        }

                        // internal callback, used to start right after STACK_STOPPED
                        if(stopCallback) {
                            sipStack = undefined;
                            stopCallback();
                            stopCallback = undefined;
                        }
                        break;
                }
            };

            // init and start a new stack
            var startStack = function() {
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
                start();
            };

            // run startStack after stop or right away
            if(sipStack) {
                // if status is not STARTED, the STOPPED event will never be send
                if(code && (code == tsip_event_code_e.STACK_STARTED || code == tsip_event_code_e.STACK_STARTING)) {
                    stopCallback = startStack;
                }
                stop();
            }
            if(!stopCallback) {
                startStack();
            }
        };

        var start = function() {
            console.info('SIP.start');

            if((!code || code != tsip_event_code_e.STACK_STARTED || code != tsip_event_code_e.STACK_STARTING) && sipStack) {
                subscriptions = {};
                states = {};
                sipStack.start();
            } else {
                console.info('SIP.start skipped because status is', status);
            }
        };

        var stop = function() {
            console.info('SIP.stop');

            if(code == tsip_event_code_e.STACK_STARTED) {
                // unsubscribe from all
                if(subscriptions) {
                    $.each(subscriptions, function(from) {
                        unsubscribe(from);
                    });
                }
            }
            if(sipStack) {
                sipStack.stop();
            }
            subscriptions = {};
            states = {};
        };

        var subscribe = function(to) {
            if(code == tsip_event_code_e.STACK_STARTED && subscriptions && sipStack) {
                if(subscriptions.hasOwnProperty(to)) {
                    console.info('SIP.subscribe (skip)');
                    // console.info('SIP already subscribed to ', to);
                } else {
                    console.info('SIP.subscribe');

                    var subscribeSession;
                    subscriptions[to] = subscribeSession;  // keep reference to prevent subscribing multiple times

                    var eventsListener = function(e){
                        if(e.getContentType() == 'application/dialog-info+xml') {
                            console.info('session event = ' + e.type);
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

                                    // broadcast presence for account
                                    chrome.runtime.sendMessage({'contacts.sip': {
                                        'account_id': to,
                                        'state': state,
                                    }});
                                    // remember subscribed accounts and its state at the time of an update
                                    states[entityUri] = {
                                        account_id: to,
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
            }
        };

        var unsubscribe = function(from) {
            console.info('SIP.unsubscribe');

            if(subscriptions.hasOwnProperty(from)) {
                if((status && status == 'started') && subscriptions[from]) {
                    subscriptions[from].unsubscribe();
                }
                delete subscriptions[from];
                delete states[from];
            }
        };

        /**
         * Perform a refresh for given account ids.
         * If reload is true it also re issues (un)subscribe events to the
         * websocket server.
         */
        var refresh = function(account_ids, reload) {
            console.info('SIP.refresh');

            var widgetsData = storage.get('widgets');
            widgetsData.contacts.status = undefined;
            storage.put('widgets', widgetsData);

            if(reload) {
                timer.startTimer('contacts.reconnect');

                // unsubscribe for lost contacts
                if(states) {
                    $.each(states, function(index, state) {
                        if(account_ids.indexOf(state.account_id) < 0) {
                            unsubscribe(state.account_id);
                        }
                    });
                }

                // subscribe for new contacts
                account_ids.forEach(function(account_id) {
                    var doSubscribe = false;
                    $.each(states, function(index, state) {
                        if(account_id == state.account_id) {
                            doSubscribe = true;
                        }
                    });
                    if(doSubscribe) {
                        subscribe(account_id);
                    }
                });
            } else {
                // broadcast presence state for known accounts
                if(states) {
                    $.each(states, function(index, state) {
                        chrome.runtime.sendMessage({'contacts.sip': {
                            'account_id': state.account_id,
                            'state': state.state,
                        }});
                    });
                }
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
