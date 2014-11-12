(function() {
    'use strict';

    var base64encode = btoa;

    window.api = (function() {
        window.getPlatformUrl = function() {
            var platformUrl = storage.get('platformUrl');
            if(platformUrl.length && platformUrl.lastIndexOf('/') != platformUrl.length - 1) {
                // force trailing slash
                platformUrl = platformUrl + '/';
            }
            if(!platformUrl.trim().length) {
                platformUrl = 'https://partner.voipgrid.nl/';
                storage.put('platformUrl', platformUrl);
            }

            return platformUrl;
        };

        // get an url to send requests to
        var getUrl = function(api) {
            return {
                autologin: 'autologin/token/',
                clicktodial: 'clicktodial/',
                phoneaccount: 'phoneaccount/basic/phoneaccount/',
                queuecallgroup: 'queuecallgroup/',
                selecteduserdestination: 'selecteduserdestination/',
                systemuser: 'permission/systemuser/profile/',
                userdestination: 'userdestination/',
            }[api];
        };

        // make an (asynchronous) api call
        var asyncRequest = function(path, content, requestMethod, callbacks) {
            console.info('calling api: ' + path);

            if(content) {
                content = JSON.stringify(content);
                console.info('using content: ' + content);
            }

            if(!callbacks.onError) {
                callbacks.onError = function() {
                    console.info('error in retrieveCredentials');
                };
            }

            if(!callbacks.onUnauthorized) {
                callbacks.onUnauthorized = function() {
                    // show this notification after being logged in once properly
                    if(storage.get('user')) {
                        // don't show more than once per login session
                        if(!storage.get('notifications').hasOwnProperty('unauthorized') || !storage.get('notifications')['unauthorized']) {
                            if(window.webkitNotifications) {
                                webkitNotifications.createNotification(
                                    '',
                                    '',
                                    translate('unauthorizedNotificationText')
                                ).show();
                            } else {
                                chrome.notifications.create('unauthorized',
                                    {
                                        type: 'basic',
                                        iconUrl: '',
                                        title: translate('unauthorizedNotificationText'),
                                        message: ''
                                    },
                                    function() {}
                                );
                            }
                            var notificationsData = storage.get('notifications');
                            notificationsData['unauthorized'] = true;
                            storage.put('notifications', notificationsData);
                        }
                    }

                    if(callbacks.onNotOk) {
                        callbacks.onNotOk();
                    }
                };
            }

            var platformUrl = getPlatformUrl();
            $.ajax({
                    url: platformUrl + 'api/' + path,
                    data: content,
                    dataType: 'json',
                    contentType: 'application/json',
                    headers: {
                        Authorization: 'Basic ' + base64encode(storage.get('username') + ':' + storage.get('password'))
                    },
                    type: requestMethod,
                })
                .always(function(data_or_jqXHR, textStatus, jqXHR_or_errorThrown) {
                    var status = 'UNKNOWN';
                    if(data_or_jqXHR && data_or_jqXHR.status) {
                        status = data_or_jqXHR.status;
                    }
                    if(jqXHR_or_errorThrown && jqXHR_or_errorThrown.status) {
                        status = jqXHR_or_errorThrown.status;
                    }
                    console.info('response status code: ' + status);

                    if(callbacks.onComplete) {
                        callbacks.onComplete();
                    }
                })
                .done(function(data, textStatus, jqXHR) {
                    switch(jqXHR.status) {
                        case 200:
                        case 201:
                        case 202:
                        case 204:
                            if(callbacks.onOk) {
                                callbacks.onOk(data);
                            }
                            break;
                    }
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    switch(jqXHR.status) {
                        case 401:  // failed to authenticate
                            if(callbacks.onUnauthorized) {
                                callbacks.onUnauthorized();
                            } else {
                                if(callbacks.onNotOk) {
                                    callbacks.onNotOk();
                                }

                                // if not logged out by callbacks.onNotOk, log out here
                                if(storage.get('user')) {
                                    logout();
                                }
                            }

                            break;
                        case 403:  // not the right permissions
                            if(callbacks.onForbidden) {
                                callbacks.onForbidden();
                            } else {
                                if(callbacks.onNotOk) {
                                    callbacks.onNotOk();
                                }
                            }
                            break;
                        default:
                            if(callbacks.onNotOk) {
                                callbacks.onNotOk();
                            }
                    }
                });
        };

        return {
            getUrl: getUrl,
            getPlatformUrl: getPlatformUrl,
            asyncRequest: asyncRequest,
        };
    })();
})();
