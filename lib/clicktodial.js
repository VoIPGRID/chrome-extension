(function() {
    'use strict';

    /**
     * Return a number trimmed from white space.
     */
    window.trimNumber = function(number) {
        // force possible int to string
        number = '' + number;

        // remove white space characters
        return number.replace(/[\s  \xA0]/g, '');
    };

    /**
     * Process number to return a callable phone number.
     */
    window.sanitizeNumber = function(number) {
        number = trimNumber(number);

        // make numbers like +31(0) work
        var digitsOnly = number.replace(/[^\d]/g, '');
        if(digitsOnly.substring(0, 3) == '310') {
            if(number.substring(3, 6) == '(0)') {
                number = number.replace(/^\+31\(0\)/, '+31');
            }
        }

        return number;
    };

    /**
     * Setup the call between the number from the user's clicktodialaccount and b_number.
     */
    window.clicktodial = (function() {
        var dial = function(b_number, tab) {
            console.info('calling ' + b_number);
            var content = {
                b_number: sanitizeNumber(b_number).replace(/[^\d+]/g, ''),  // just make sure b_number is numbers only
            };

            api.asyncRequest(
                api.getUrl('clicktodial'),
                content,
                'post',
                {
                    onOk: function(response) {
                        // this callid is used to find the call status, so without it: stop now
                        if(!response.callid) {
                            if(window.webkitNotifications) {
                                webkitNotifications.createNotification(
                                    '', // 'clicktodial/assets/img/clicktodial.png',
                                    '',
                                    translate('callFailedNotificationText')
                                ).show();
                            } else {
                                chrome.notifications.create('failed-call',
                                    {
                                        type: 'basic',
                                        // iconUrl: chrome.runtime.getURL('data/clicktodial/assets/img/clicktodial.png'),
                                        iconUrl: '',
                                        title: translate('callFailedNotificationText'),
                                        message: ''
                                    },
                                    function() {}
                                );
                            }
                            return;
                        }

                        var callid = response.callid;
                        var current_tab = tab.id;
                        var timerSuffix = '-' + callid;

                        // keep updating the call status to the panel
                        var timerFunction = function() {
                            api.asyncRequest(
                                api.getUrl('clicktodial') + callid + '/',
                                null,
                                'get',
                                {
                                    onOk: function(response) {
                                        console.info('clicktodial status: ' + response.status);

                                        // stop after receiving these statuses
                                        var statuses = ['blacklisted', 'disconnected', 'failed_a', 'failed_b'];
                                        if(statuses.indexOf(response.status) != -1) {
                                            timer.stopTimer('clicktodial.status' + timerSuffix);
                                            timer.unregisterTimer('clicktodial.status' + timerSuffix);
                                        }

                                        // update panel with latest status
                                        chrome.tabs.sendMessage(current_tab, {'clicktodial.status': {
                                            status: getStatusMessage(response.status, b_number),
                                            // extra info to identify call
                                            callid: callid
                                        }});
                                    },
                                    onNotOk: function() {
                                        // clear interval, stop timer
                                        timer.stopTimer('clicktodial.status' + timerSuffix);
                                        timer.unregisterTimer('clicktodial.status' + timerSuffix);
                                    },
                                }
                            );
                        };

                        timer.registerTimer('clicktodial.status' + timerSuffix, timerFunction);
                        timer.setInterval('clicktodial.status' + timerSuffix, 1500);

                        chrome.runtime.onMessage.addListener(
                            function(request, sender, sendResponse) {
                                if(sender.tab && sender.tab.id == current_tab) {
                                    if(request.hasOwnProperty('clicktodialpanel.onshow')) {
                                        // copy the number to the panel
                                        chrome.tabs.sendMessage(current_tab, {'clicktodial.b_number': {
                                            b_number: b_number,
                                            // extra info to identify call
                                            callid: callid
                                        }});

                                        // copy the initial status
                                        chrome.tabs.sendMessage(current_tab, {'clicktodial.status': {
                                            status: getStatusMessage(response.status, b_number),
                                            // extra info to identify call
                                            callid: callid
                                        }});
                                    }
                                }
                            });

                        chrome.tabs.sendMessage(current_tab, {'clicktodialpanel.show': {
                            // extra info to identify call
                            callid: callid
                        }});
                    },
                    onNotOk: function(response) {
                        if(window.webkitNotifications) {
                            webkitNotifications.createNotification(
                                '', // 'clicktodial/assets/img/clicktodial.png',
                                '',
                                translate('callFailedNotificationText')
                            ).show();
                        } else {
                            chrome.notifications.create('failed-call',
                                {
                                    type: 'basic',
                                    // iconUrl: chrome.runtime.getURL('data/clicktodial/assets/img/clicktodial.png'),
                                    iconUrl: '',
                                    title: translate('callFailedNotificationText'),
                                    message: ''
                                },
                                function() {}
                            );
                        }
                        return;
                    },
                }
            );
        };

        function getStatusMessage(status, b_number) {
            var messages = {
                'dialing_a': translate('clicktodialStatusDialingA'),
                'confirm': translate('clicktodialStatusConfirm'),
                'dialing_b': translate('clicktodialStatusDialingB', b_number),
                'connected': translate('clicktodialStatusConnected'),
                'disconnected': translate('clicktodialStatusDisconnected'),
                'failed_a': translate('clicktodialStatusFailedA'),
                'blacklisted': translate('clicktodialStatusBlacklisted'),
                'failed_b': translate('clicktodialStatusFailedB', b_number),
            };

            var message = translate('clicktodialCallingText');
            if(messages.hasOwnProperty(status)) {
                message = messages[status];
            }

            return message;
        }

        return {
            dial: dial,
        };
    })();
})();
