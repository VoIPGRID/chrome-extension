(function() {
    'use strict';

    window.panels = (function() {
        var MainPanel = function(widgets) {
            clickToDialPanelMessages();
            mainPanelMessages();
        };

        /**
         * Initialize all widgets.
         */
        function refreshWidgets() {
            // resets widget data
            if(storage.get('widgets') === null) {
                var widgetData = {isOpen: {}};
                for(var widget in widgets) {
                    // initial state for widget
                    widgetData.isOpen[widget] = false;
                    // each widget can share variables here
                    widgetData[widget] = {};
                }
                storage.put('widgets', widgetData);
            }

            // initial state for mainpanel
            if(storage.get('isMainPanelOpen') === null) {
                storage.put('isMainPanelOpen', false);
            }

            for(var widget in widgets) {
                chrome.runtime.sendMessage({'widget.close': {name: widget}});
                chrome.runtime.sendMessage({'widget.indicator.start': {name: widget}});
            }

            for(var widget in widgets) {
                widgets[widget].load();
            }
        }

        /**
         * Reset storage.
         */
        var resetStorage = function() {
            storage.remove('widgets');
            storage.remove('isMainPanelOpen');
        };

        /**
         * Reset all widgets.
         */
        var resetWidgets = function() {
            for(var widget in widgets) {
                widgets[widget].reset();
            }
        };

        /**
         * Event listeners for clicktodialpanel.
         */
        function clickToDialPanelMessages() {
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request.hasOwnProperty('clicktodialpanel.onhide')) {
                        console.info('clicktodialpanel.onhide');

                        // we no longer need this call's status
                        var timerSuffix = '-' + request['clicktodialpanel.onhide'].callid;
                        timer.stopTimer('clicktodial.status' + timerSuffix);
                        timer.unregisterTimer('clicktodial.status' + timerSuffix);
                    } else if(request.hasOwnProperty('clicktodialpanel.onshow')) {
                        console.info('clicktodialpanel.onshow');

                        // start updating the call status
                        var timerSuffix = '-' + request['clicktodialpanel.onshow'].callid;
                        timer.startTimer('clicktodial.status' + timerSuffix);
                    }
                });
        }

        /**
         * Event listeners for mainpanel.
         */
        function mainPanelMessages() {
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request.hasOwnProperty('login.attempt')) {
                        // attempt to log in
                        console.info('login.attempt');

                        storage.put('username', request['login.attempt'].username);
                        storage.put('password', request['login.attempt'].password);

                        chrome.runtime.sendMessage('login.indicator.start');

                        // make an api call to authenticate and save the credentials in storage
                        api.asyncRequest(
                            api.getUrl('systemuser'),
                            null,
                            'get',
                            {
                                onComplete: function() {
                                    // reset login button
                                    chrome.runtime.sendMessage('login.indicator.stop');
                                },
                                onOk: function(response) {
                                    // users are unique so find the user matching *username*
                                    response.objects.forEach(function(user) {
                                        if(user.email == storage.get('username') || user.username == storage.get('username')) {
                                            storage.put('user', user);
                                        }
                                    });

                                    // parse and set the client id as a new property
                                    var user = storage.get('user');
                                    user.client_id = user.client.replace(/[^\d.]/g, '');
                                    storage.put('user', user);
                                    chrome.runtime.sendMessage({'login.success': {user: storage.get('user')}});

                                    // reset seen notifications
                                    var notificationsData = storage.get('notifications');
                                    notificationsData['unauthorized'] = false;
                                    storage.put('notifications', notificationsData);

                                    // start loading the widgets
                                    refreshWidgets();

                                    // look for phone numbers in tabs from now on
                                    page.init();
                                },
                                onNotOk: function() {
                                    chrome.runtime.sendMessage('login.failed');

                                    storage.remove('username');
                                    storage.remove('password');
                                },
                            }
                        );

                    } else if(request.hasOwnProperty('widget.open')) {
                        // keep track of opened widgets
                        console.info('widget.open');

                        var widgetData = storage.get('widgets');
                        widgetData.isOpen[request['widget.open'].name] = true;
                        storage.put('widgets', widgetData);

                        timer.update();
                    } else if(request.hasOwnProperty('widget.close')) {
                        // keep track of closed widgets
                        console.info('widget.close');

                        var widgetData = storage.get('widgets');
                        widgetData.isOpen[request['widget.close'].name] = false;
                        storage.put('widgets', widgetData);

                        timer.update();
                    } else if(request == 'logout.attempt') {
                        console.info('logout.attempt');

                        logout();
                    } else if(request == 'refresh') {
                        console.info('mainpanel.refresh');

                        chrome.runtime.sendMessage('mainpanel.refresh.start');
                        refreshWidgets();
                        chrome.runtime.sendMessage('mainpanel.refresh.stop');
                    }  else if(request == 'help') {
                        // open the firefox plugin wiki page
                        console.info('mainpanel.help');

                        chrome.tabs.create({url: 'http://wiki.voipgrid.nl/index.php/Chrome_plugin'});
                    } else if(request == 'settings') {
                        console.info('mainpanel.settings');

                        /**
                         * Open settings url with or without a token for auto login.
                         * Either opens:
                         *  - platformUrl + user/autologin/?token=*token*&username=*username*&next=/ + path (with token)
                         *  - platformUrl + path (without token)
                         */
                        var openSettings = function(response) {
                            var path = 'client/' + storage.get('user').client_id + '/user/' + storage.get('user').id + '/change/#tabs-3';

                            // add token if possible
                            if(response.token) {
                                path = 'user/autologin/?token=' + response.token + '&username=' + storage.get('username') + '&next=/' + path;
                            }

                            var platformUrl = storage.get('platformUrl');
                            if(platformUrl.length && platformUrl.lastIndexOf('/') != platformUrl.length - 1) {
                                // force trailing slash
                                platformUrl = platformUrl + '/';
                            }
                            chrome.tabs.create({url: platformUrl + path});
                        };

                        api.asyncRequest(
                            api.getUrl('autologin'),
                            null,
                            'get',
                            {
                                onOk: openSettings,
                                onNotOk: openSettings,
                            }
                        );

                    } else if(request == 'close') {
                        console.info('mainpanel.close');
                    } else if(request == 'restore') {
                        // restore UI for widgets from localStorage
                        for(var widget in widgets) {
                            widgets[widget].restore();
                        }
                    }
                });
        }

        return {
            MainPanel: MainPanel,
            resetStorage: resetStorage,
            resetWidgets: resetWidgets,
        };
    })();
})();
