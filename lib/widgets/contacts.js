(function() {
    'use strict';

    var name = 'contacts',
        realm = 'websocket.voipgrid.nl';

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

        var initializeSIPmlCallback = function() {
            var connectedCallback = function() {
                var widgetsData = storage.get('widgets');
                $.each(widgetsData.contacts.list, function(index, contact) {
                    window.SIP.subscribe('' + contact.account_id);
                });
            };

            var user = storage.get('user');
            window.SIP.init({
                realm: realm,
                impi: user.email, // user email address
                impu: 'sip:' + user.email + '@' + realm,
                password: user.token, // user access token
                display_name: '', // empty as long as we're just subscribing
                websocket_proxy_url: 'wss://' + realm,
                connected: connectedCallback
            });
            window.SIP.start();
        };

        function startSubscriptions() {
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
                window.SIPml.setDebugLevel('warn');  // supported values: info, warn, error and fatal.
            }

            // hide element
            $('embed').hide();
        }

        var load = function(update) {
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
                        // remove accounts that are not currently subscribed
                        for(var i = contacts.length-1; i >= 0; i--) {
                            if(!contacts[i].hasOwnProperty('sipreginfo')) {
                                contacts.splice(i, 1);
                            }
                        }

                        var widgetsData = storage.get('widgets');
                        widgetsData.contacts.list = contacts;
                        storage.put('widgets', widgetsData);

                        if(contacts.length) {
                            chrome.runtime.sendMessage('contacts.reset');
                            chrome.runtime.sendMessage({'contacts.fill': {contacts: contacts}}, function() {
                                if(update) {
                                    window.SIP.refresh();
                                } else {
                                    startSubscriptions();
                                }
                            });
                        } else {
                            chrome.runtime.sendMessage('contacts.empty');
                        }
                    },
                    onNotOk: function() {
                        // cancel active subscriptions
                        window.SIP.stop();
                    },
                    onUnauthorized: function() {
                        // cancel active subscriptions
                        window.SIP.stop();
                    },
                }
            );
        };

        var reset = function() {
            chrome.runtime.sendMessage('contacts.reset');
            chrome.runtime.sendMessage('contacts.empty');

            window.SIP.stop();
        };

        var restore = function() {
            console.info('reloading widget ' + name);

            // restore contacts
            var widgetsData = storage.get('widgets');
            var contacts = widgetsData.contacts.list;

            if(contacts.length) {
                chrome.runtime.sendMessage('contacts.reset');
                chrome.runtime.sendMessage({'contacts.fill': {contacts: contacts}}, window.SIP.refresh);

                // window.SIP.refresh();
            } else {
                chrome.runtime.sendMessage('contacts.empty');
            }
        };

        return {
            load: load,
            reset: reset,
            restore: restore,
        };
    })();
})();
