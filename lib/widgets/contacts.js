(function() {
    'use strict';

    var name = 'contacts',
        updateInterval = 3600 * 1000;

    widgets[name] = (function() {
        function getContacts(onOk) {
            api.asyncRequest(
                api.getUrl('phoneaccount') + '?active=true',
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

        var load = function() {
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

                    // start polling for presence information for these contacts
                    chrome.runtime.sendMessage('sip.start');
                } else {
                    chrome.runtime.sendMessage('contacts.empty');

                    // stop polling for presence information
                    chrome.runtime.sendMessage('sip.stop');
                }

                setContactsRefreshTimer();
            });
        };

        function update() {
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
                } else {
                    chrome.runtime.sendMessage('contacts.empty');
                }

                // update presence subscriptions
                chrome.runtime.sendMessage('sip.update');

                setContactsRefreshTimer();
            });
        }

        function setContactsRefreshTimer() {
            function timerFunction() {
                console.info('contacts.refresh');

                chrome.runtime.sendMessage({'widget.indicator.start': {name: name}});

                update();
            }

            timer.registerTimer('contacts.refresh', timerFunction);
            timer.setTimeout('contacts.refresh', updateInterval);
            timer.startTimer('contacts.refresh');
        }

        var reset = function() {
            timer.stopTimer('contacts.refresh');
            timer.unregisterTimer('contacts.refresh');
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
