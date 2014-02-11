(function() {
    'use strict';

    /**
     * Setup the call between the number from the user's clicktodialaccount and b_number.
     */
    window.clicktodial = (function() {
        var dial = function(b_number, tab) {
            console.info('calling ' + b_number);
            var content = {
                b_number: '' + b_number.replace(/[^0-9+]/g, ''),  // just make sure b_number is numbers only
            };

            api.asyncRequest(
                api.getUrl('clicktodial'),
                content,
                'post',
                {
                    onOk: function(response) {
                        // this callid is used to find the call status, so without it: stop now
                        if(!response.callid) {
                            webkitNotifications.createNotification(
                                '', // 'clicktodial/assets/img/clicktodial.png',
                                '',
                                // 'Failed to set up call'
                                'Het is niet gelukt om het gesprek op te zetten.'
                            ).show();
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
                        webkitNotifications.createNotification(
                            '', // 'clicktodial/assets/img/clicktodial.png',
                            '',
                            // 'Failed to set up call'
                            'Het is niet gelukt om het gesprek op te zetten.'
                        ).show();
                        return;
                    },
                }
            );
        };

        function getStatusMessage(status, b_number) {
            var messages = {
                'dialing_a': 'Je toestel wordt gebeld', // 'Your phone is being called'
                'confirm': 'Toets 1 om het gesprek aan te nemen', // 'Press 1 to accept the call'
                'dialing_b': b_number + ' wordt gebeld', // '"b_number" is being called'
                'connected': 'Verbonden', // 'Connected'
                'disconnected': 'Verbinding verbroken', // 'Connection lost'
                'failed_a': 'We konden je toestel niet bereiken', // 'We could not reach your phone'
                'blacklisted': 'Het nummer staat op de blacklist', // 'The number is on the blacklist'
                'failed_b': b_number + ' kon niet worden bereikt', // '"b_number" could not be reached'
            };

            var message = 'Gesprek aan het opzetten ..';  // 'Calling ..'
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
