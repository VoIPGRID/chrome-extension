(function() {
    'use strict';

    var name = 'contacts',
        updateInterval = 3600 * 1000;

    widgets[name] = (function() {
        function getContacts(onOk) {
            api.asyncRequest(
                api.getUrl('phoneaccount') + '?active=true&order_by=internal_number',
                null,
                'get',
                {
                    onComplete: function() {
                        chrome.runtime.sendMessage({'widget.indicator.stop': {name: name}});
                    },
                    onOk: onOk
                }
            );
        }

        var load = function(update) {
            getContacts(function(response) {
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
                    chrome.runtime.sendMessage({'contacts.fill': {contacts: contacts}});

                    if(update) {
                        // update presence subscriptions
                        chrome.runtime.sendMessage('sip.update');
                    } else {
                        // start polling for presence information for these contacts
                        var user = storage.get('user');
                        chrome.runtime.sendMessage({'sip.init': {'email': user.email, 'token': user.token}});
                    }
                } else {
                    chrome.runtime.sendMessage('contacts.empty');

                    // stop polling for presence information
                    chrome.runtime.sendMessage('sip.stop');
                }
            });
        };

        var reset = function() {
            chrome.runtime.sendMessage('contacts.reset');
            chrome.runtime.sendMessage('contacts.empty');
            chrome.runtime.sendMessage('sip.stop');
        };

        var restore = function() {
            console.info('reloading widget ' + name);

            // restore contacts
            var widgetsData = storage.get('widgets');
            var contacts = widgetsData.contacts.list;

            if(contacts.length) {
                chrome.runtime.sendMessage('contacts.reset');
                chrome.runtime.sendMessage({'contacts.fill': {contacts: contacts}});
            } else {
                chrome.runtime.sendMessage('contacts.empty');
            }

            // restore presence subscriptions
            chrome.runtime.sendMessage('sip.start');
        };

        return {
            init: function() {},
            load: load,
            reset: reset,
            restore: restore,
        };
    })();
})();
