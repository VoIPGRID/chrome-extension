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

    var openNotificationTimeout;

    /**
     * Display a notification regarding what happened to a call.
     */
    function callFailedNotification(notificationId, text) {
        if(!text) {
            notificationId = 'failed-call';
            text = translate('callFailedNotificationText');
        }

        if(window.webkitNotifications) {
            webkitNotifications.createNotification(
                '', // 'clicktodial/assets/img/clicktodial.png',
                '',
                text
            ).show();
        } else {
            var notificationCallback = function() {
                // without clearing you can't trigger notifications with the same notificationId (quickly)
                openNotificationTimeout = setTimeout(function() {
                    chrome.notifications.clear(notificationId, function(wasCleared) {});
                    clearTimeout(openNotificationTimeout);
                    openNotificationTimeout = undefined;
                }, 3000);
            };
            if(openNotificationTimeout) {
                clearTimeout(openNotificationTimeout);
                    openNotificationTimeout = undefined;

                text = text + ' (update)';
                chrome.notifications.update(notificationId, {
                        title: text
                    },
                    notificationCallback
                );
            } else {
                chrome.notifications.create(notificationId, {
                        type: 'basic',
                        iconUrl: chrome.runtime.getURL('data/clicktodial/assets/img/clicktodial-big.png'),
                        title: text,
                        message: ''
                    },
                    notificationCallback
                );
            }
        }
    }

    /**
     * Display a notification with a call's status.
     */
    function callStatusNotification(status, b_number) {
        callFailedNotification('call-status', clicktodial.getStatusMessage(status, b_number));
    }

    /**
     * Setup the call between the number from the user's clicktodialaccount and b_number.
     */
    window.clicktodial = (function() {
        var dial = function(b_number, tab, silent) {
            if(silent) {
                console.info('calling ' + b_number + ' silently');
            } else {
                console.info('calling ' + b_number);
            }
            var content = {
                // just make sure b_number is numbers only
                b_number: sanitizeNumber(b_number).replace(/[^\d+]/g, ''),
            };

            api.asyncRequest(
                api.getUrl('clicktodial'),
                content,
                'post',
                {
                    onOk: function(response) {
                        // this callid is used to find the call status, so without it: stop now
                        if(!response.callid) {
                            callFailedNotification();
                            return;
                        }

                        var callid = response.callid;
                        var timerSuffix = '-' + callid;

                        if(silent) {
                            /**
                             * A silent call means there won't be a visible popup
                             * informing the user of the call's status. Only in case
                             * the call failed to connect both sides, a notification
                             * will show.
                             */
                            var silentTimerFunction = function() {
                                api.asyncRequest(
                                    api.getUrl('clicktodial') + callid + '/',
                                    null,
                                    'get',
                                    {
                                        onOk: function(response) {
                                            console.info('clicktodial status: ' + response.status);

                                            // stop after receiving these statuses
                                            var statuses = ['connected', 'blacklisted', 'disconnected', 'failed_a', 'failed_b'];
                                            if(statuses.indexOf(response.status) != -1) {
                                                timer.stopTimer('clicktodial.status' + timerSuffix);
                                                timer.unregisterTimer('clicktodial.status' + timerSuffix);

                                                // show status in a notification in case it fails/disconnects
                                                if(response.status != 'connected') {
                                                    callStatusNotification(response.status, b_number);
                                                }
                                            }
                                        },
                                        onNotOk: function() {
                                            // clear interval, stop timer
                                            timer.stopTimer('clicktodial.status' + timerSuffix);
                                            timer.unregisterTimer('clicktodial.status' + timerSuffix);
                                        },
                                    }
                                );
                            };

                            timer.registerTimer('clicktodial.status' + timerSuffix, silentTimerFunction);
                            timer.setInterval('clicktodial.status' + timerSuffix, 1500);

                            // instant start, no need to wait for panels in the browser to be visible
                            timer.startTimer('clicktodial.status' + timerSuffix);
                        } else {
                            /**
                             * A non-silent call will display the call's status
                             * in a popup in the active tab. Whenever the call
                             * couldn't connect both sides, a notification
                             * will show.
                             */
                            var current_tab = tab.id;

                            // keep updating the call status to the panel
                            var timerFunction = function() {
                                if(timer.getRegisteredTimer('clicktodial.status' + timerSuffix)) {
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
                                }
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
                        }
                    },
                    onNotOk: function(response) {
                        callFailedNotification();
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
            getStatusMessage: getStatusMessage,
        };
    })();
})();
