(function() {
    'use strict';

    var name = 'availability';

    widgets[name] = (function() {
        var init = function() {
            function selectUserdestination(type, id) {
                var content = {
                    fixeddestination: null,
                    phoneaccount: null,
                };
                if(type) {
                    content[type] = id;
                }

                // save selection
                api.asyncRequest(
                    api.getUrl('selecteduserdestination') + storage.get('user').selectedUserdestinationId + '/',
                    content,
                    'put',
                    {
                        onOk: function() {
                            // set an icon depending on whether the user is available or not
                            var icon = 'data/widgets/assets/img/availability/call-red.png';
                            if(id) {
                                icon = 'data/widgets/assets/img/availability/call-green.png';
                            }
                            var widgetsData = storage.get('widgets');
                            widgetsData.availability.icon = icon;
                            storage.put('widgets', widgetsData);
                            if(widgetsData.queues && !widgetsData.queues.selected) {
                                chrome.browserAction.setIcon({path: icon});
                            }
                            var userData = storage.get('user');
                            userData.userdestination['selecteduserdestination']['fixeddestination'] = content.fixeddestination;
                            userData.userdestination['selecteduserdestination']['phoneaccount'] = content.phoneaccount;
                            storage.put('user', userData);
                        },
                        onNotOk: function() {
                            // jump back to previously selected (the one currently in cache)
                            restore();

                            // FIXME: show a notification something went wrong ?
                        },
                        onUnauthorized: function() {
                            // jump back to previously selected (the one currently in cache)
                            restore();

                            // FIXME: show a notification something went wrong ?
                        },
                    }
                );
            }

            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request.hasOwnProperty('availability.select')) {
                        console.info('availability.select');

                        var type = request['availability.select'].type;
                        var id = request['availability.select'].id;
                        selectUserdestination(type, id);
                    }
                });
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request.hasOwnProperty('availability.toggle')) {
                        console.info('availability.toggle');

                        var type = request['availability.toggle'].type;
                        var id = request['availability.toggle'].id;
                        selectUserdestination(type, id);
                        chrome.runtime.sendMessage('availability.refresh');
                    }
                });
        };

        var buildOptions = function(userdestination, selectedFixeddestinationId, selectedPhoneaccountId) {
            // destinations choices
            var fixeddestinations = userdestination['fixeddestinations'];
            var phoneaccounts = userdestination['phoneaccounts'];

            var options = [];
            fixeddestinations.forEach(function(fixeddestination) {
                var option = {
                    'value': 'fixeddestination-' + fixeddestination.id,
                    'label': fixeddestination.phonenumber + '/' + fixeddestination.description,
                };
                if(fixeddestination.id == selectedFixeddestinationId) {
                    option['selected'] = true;
                }
                // add fixed destination to options
                options.push(option);
            });
            phoneaccounts.forEach(function(phoneaccount) {
                var option = {
                    'value': 'phoneaccount-' + phoneaccount.id,
                    'label': phoneaccount.internal_number + '/' + phoneaccount.description,
                };
                if(phoneaccount.id == selectedPhoneaccountId) {
                    option['selected'] = true;
                }
                // add phone account to options
                options.push(option);
            });

            return options;
        };

        var load = function() {
            api.asyncRequest(
                api.getUrl('userdestination'),
                null,
                'get',
                {
                    onComplete: function() {
                        chrome.runtime.sendMessage({'widget.indicator.stop': {name: name}});
                    },
                    onOk: function(response) {
                        chrome.runtime.sendMessage('availability.reset');

                        // there is only one userdestination so objects[0] is the right (and only) one
                        var userdestination = response.objects[0];
                        var userData = storage.get('user');
                        if(userData) {
                             // save userdestination in storage
                            userData.userdestination = userdestination;

                            // save id for reference when changing the userdestination
                            userData.selectedUserdestinationId = userdestination['selecteduserdestination']['id'];
                            storage.put('user', userData);
                        }

                        // currently selected destination
                        var selectedFixeddestinationId = userdestination['selecteduserdestination']['fixeddestination'];
                        var selectedPhoneaccountId = userdestination['selecteduserdestination']['phoneaccount'];

                        // build options for the availability dropdown
                        var options = buildOptions(userdestination, selectedFixeddestinationId, selectedPhoneaccountId);

                        var widgetsData = storage.get('widgets');
                        widgetsData.availability.options = options;
                        widgetsData.availability.unauthorized = false;
                        storage.put('widgets', widgetsData);

                        // fill the dropdown with these choices
                        if(options.length) {
                            chrome.runtime.sendMessage({'availability.fill': {destinations: options}});
                        }

                        // set an icon depending on whether the user is available or not
                        var icon = 'data/widgets/assets/img/availability/call-red.png';
                        if(selectedFixeddestinationId || selectedPhoneaccountId) {
                            icon = 'data/widgets/assets/img/availability/call-green.png';
                        }
                        if(!widgetsData.queues.selected) {
                            chrome.browserAction.setIcon({path: icon});
                        }

                        // save icon in storage
                        widgetsData.availability.icon = icon;
                        storage.put('widgets', widgetsData);
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
                    },
                }
            );
        };

        var reset = function() {
            chrome.runtime.sendMessage('availability.reset');
            chrome.browserAction.setIcon({path: 'data/assets/img/call-gray.png'});
        };

        var restore = function() {
            console.info('reloading widget ' + name);

            // check if unauthorized
            var widgetsData = storage.get('widgets');
            if(widgetsData.availability.unauthorized) {
                chrome.runtime.sendMessage({'widget.unauthorized': {name: name}});
            } else {
                // restore options
                var userData = storage.get('user');
                if(userData) {
                    var userdestination = userData.userdestination;
                    var selectedFixeddestinationId = userdestination['selecteduserdestination']['fixeddestination'];
                    var selectedPhoneaccountId = userdestination['selecteduserdestination']['phoneaccount'];
                    var options = buildOptions(userdestination, selectedFixeddestinationId, selectedPhoneaccountId);

                    chrome.runtime.sendMessage('availability.reset');
                    if(options.length) {
                        chrome.runtime.sendMessage({'availability.fill': {destinations: options}});
                    }
                }

                // restore icon
                if(widgetsData.availability.icon) {
                    if(!widgetsData.queues.selected) {
                        chrome.browserAction.setIcon({path: widgetsData.availability.icon});
                    }
                }

                // restore availability
                chrome.runtime.sendMessage('availability.refresh');
            }
        };

        return {
            init: init,
            load: load,
            reset: reset,
            restore: restore,
        };
    })();
})();
