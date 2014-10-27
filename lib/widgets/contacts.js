(function() {
    'use strict';

    var name = 'contacts',
        realm = 'websocket.voipgrid.nl',
        retryTimeout = 5000;

    widgets[name] = (function() {
        // subscribe to presence updates for account_id
        function subscribe(account_id) {
            var impu = 'sip:'+ account_id + '@' + realm;
            window.SIP.subscribe(impu);
        }

        // stop receiving presence updates for account_id
        function unsubscribe(account_id) {
            var impu = 'sip:'+ account_id + '@' + realm;
            window.SIP.unsubscribe(impu);
        }

        // reconnect to presence resource
        function reconnect() {
            if(timer.getRegisteredTimer('contacts.reconnect')) {
                console.log('reconnect');

                timer.setTimeout('contacts.reconnect', retryTimeout);

                startSubscriptions();
            }
        }

        var initializeSIPmlCallback = function() {
            var startingCallback = function() {
                var widgetsData = storage.get('widgets');
                widgetsData.contacts.status = 'connecting';
                storage.put('widgets', widgetsData);

                chrome.runtime.sendMessage('contacts.connecting');
            };
            var failedToStartCallback = function() {
                var widgetsData = storage.get('widgets');
                widgetsData.contacts.status = 'failed_to_start';
                storage.put('widgets', widgetsData);

                chrome.runtime.sendMessage('contacts.failed_to_start');

                // start reconnection attempts
                timer.startTimer('contacts.reconnect');
            };
            var startedCallback = function() {
                var widgetsData = storage.get('widgets');
                widgetsData.contacts.status = 'connected';
                storage.put('widgets', widgetsData);

                $.each(widgetsData.contacts.list, function(index, contact) {
                    window.SIP.subscribe('' + contact.account_id);
                });
                chrome.runtime.sendMessage('contacts.connected');

                // stop reconnection attempts
                timer.stopTimer('contacts.reconnect');
                timer.setTimeout('contacts.reconnect', retryTimeout);
            };
            var stoppedCallback = function() {
                var widgetsData = storage.get('widgets');
                if(widgetsData) {
                    widgetsData.contacts.status = 'disconnected';
                    storage.put('widgets', widgetsData);
                }

                chrome.runtime.sendMessage('contacts.disconnected');

                // start reconnection attempts
                timer.startTimer('contacts.reconnect');
            };

            var user = storage.get('user');
            window.SIP.init({
                realm: realm,
                impi: user.email, // user email address
                impu: 'sip:' + user.email + '@' + realm,
                password: user.token, // user access token
                display_name: '', // empty as long as we're just subscribing
                websocket_proxy_url: 'wss://' + realm,
                callbacks: {
                    starting: startingCallback,
                    failed_to_start: failedToStartCallback,
                    started: startedCallback,
                    stopped: stoppedCallback,
                },
            });
            window.SIP.start();
        };

        function startSubscriptions() {
            console.log('contacts.startSubscriptions');

            // initialize SIPml if necessary
            if(window.SIPml.isInitialized()) {
                initializeSIPmlCallback();
            } else {
                window.SIPml.init(
                    initializeSIPmlCallback,
                    function(event) {
                        console.error('Failed to initialize the engine: ' + event.message);
                    }
                );
                window.SIPml.setDebugLevel('info');  // supported values: info, warn, error and fatal.
                window.SIPml.setDebugLevel('warn');  // supported values: info, warn, error and fatal.
            }
        }

        function updateSubscriptions(reload) {
            console.log('contacts.updateSubscriptions - reload:', !!reload);

            var widgetsData = storage.get('widgets');
            var account_ids = [];
            widgetsData.contacts.list.forEach(function(contact) {
                account_ids.push(''+contact.account_id);
            });
            window.SIP.refresh(account_ids, reload);
        }

        var load = function(update) {
            if(!update) {
                timer.registerTimer('contacts.reconnect', reconnect);
            }
            api.asyncRequest(
                api.getUrl('phoneaccount') + '?active=true&order_by=internal_number',
                null,
                'get',
                {
                    onComplete: function() {
                        chrome.runtime.sendMessage({'widget.indicator.stop': {name: name}});
                    },
                    onOk: function(response) {
                        var contacts = response.objects;

                        // remove accounts that are not currently registered
                        for(var i = contacts.length-1; i >= 0; i--) {
                            if(!contacts[i].hasOwnProperty('sipreginfo')) {
                                contacts.splice(i, 1);
                            }
                        }

                        var widgetsData = storage.get('widgets');
                        if(widgetsData) {
                            widgetsData.contacts.list = contacts;
                            widgetsData.contacts.unauthorized = false;
                            widgetsData.contacts.status = 'connecting';
                            storage.put('widgets', widgetsData);

                            chrome.runtime.sendMessage('contacts.connecting');

                            if(contacts.length) {
                                chrome.runtime.sendMessage('contacts.reset');
                                chrome.runtime.sendMessage({'contacts.fill': {contacts: contacts}}, function() {
                                    if(update) {
                                        updateSubscriptions(true);
                                    } else {
                                        startSubscriptions();
                                    }
                                });
                            } else {
                                chrome.runtime.sendMessage('contacts.empty');

                                // cancel active subscriptions
                                // window.SIP.stop();
                            }
                        }
                    },
                    onNotOk: function() {
                        // stop reconnection attempts
                        timer.stopTimer('contacts.reconnect');

                        // cancel active subscriptions
                        window.SIP.stop();
                    },
                    onUnauthorized: function() {
                        console.info('widget.unauthorized: ' + name);

                        // update authorization status
                        var widgetsData = storage.get('widgets');
                        widgetsData[name].unauthorized = true;
                        storage.put('widgets', widgetsData);

                        // display an icon explaining the user lacks permissions to use
                        // this feature of the plugin
                        chrome.runtime.sendMessage({'widget.unauthorized': {name: name}});

                        // stop reconnection attempts
                        timer.stopTimer('contacts.reconnect');

                        // cancel active subscriptions
                        window.SIP.stop();
                    },
                }
            );
        };

        var reset = function() {
            chrome.runtime.sendMessage('contacts.reset');
            chrome.runtime.sendMessage('contacts.empty');

            // stop reconnection attempts
            timer.stopTimer('contacts.reconnect');
            timer.unregisterTimer('contacts.reconnect');

            window.SIP.stop();
        };

        var restore = function() {
            console.info('reloading widget ' + name);

            // check if unauthorized
            var widgetsData = storage.get('widgets');
            if(widgetsData.contacts.unauthorized) {
                chrome.runtime.sendMessage({'widget.unauthorized': {name: name}});
            } else {
                // restore contacts
                var contacts = widgetsData.contacts.list;
                if(contacts && contacts.length) {
                    chrome.runtime.sendMessage('contacts.reset');
                    chrome.runtime.sendMessage({'contacts.fill': {contacts: contacts}}, function() {
                        updateSubscriptions(false);
                    });
                } else {
                    chrome.runtime.sendMessage('contacts.empty');
                }
            }

            if(widgetsData.contacts.status) {
                chrome.runtime.sendMessage('contacts.' + widgetsData.contacts.status);
            }
        };

        return {
            load: load,
            reset: reset,
            restore: restore,
        };
    })();
})();
