(function() {
    'use strict';

    var storage;

    try {
        var backgroundPage = chrome.extension.getBackgroundPage();
        panels(backgroundPage);
    } catch(Exception) {
        chrome.runtime.getBackgroundPage(panels);
    }

    // very simple cache
    window.cache = {};

    function panels(backgroundPage) {
        storage = backgroundPage.storage;

        $(function() {
            /**
             * Show/hide the login form.
             */
            function showLoginForm() {
                $('.login-section').removeClass('hide');

                // reset the login form
                $('.login-form :input:visible').val('');
                resetButton();

                // focus the first input field
                $('.login-form :input:visible:first').focus();
            }
            function hideLoginForm() {
                $('.login-section').addClass('hide');
            }

            /**
             * Show/hide the panel's content.
             */
            function showPanel() {
                $('.container').removeClass('hide');
            }
            function hidePanel() {
                $('.container').addClass('hide');
            }

            /**
             * Capture keys in login form.
             */
            $('.login-form :input').keydown(function(e) {
                switch(e.which) {
                    // cycle through proper fields with tab
                    case 9:
                        var that = this;
                        var inputs = $('.login-form :input').filter(function(index, input) {
                            return that.tabIndex < input.tabIndex;
                        });

                        if(inputs.length === 0) {
                            $('#username').focus();
                        } else {
                            $(inputs[0]).focus();
                        }

                        e.preventDefault();
                        break;
                    // login on enter
                    case 13:
                        login();

                        e.preventDefault();
                        break;
                }

                if($('.login-button').hasClass('temporary-text')) {
                    resetButton();
                }
            });

            /**
             * Attempt to login.
             */
            function login() {
                // login when form is not empty
                if($('#username').val().trim().length && $('#password').val().length) {
                    chrome.runtime.sendMessage({'login.attempt': {
                        username: $('#username').val().trim(),
                        password: $('#password').val()
                    }});
                }
            }

            /**
             * Login with the button.
             */
            $('.login-button').click(function() {
                if($('.login-button').hasClass('temporary-text')) {
                    resetButton();
                } else {
                    login();
                }
            });

            /**
             * When logging in, display an indicator.
             */
            function busyLoginButton() {
                var button = $('.login-button');
                $(button)
                    .html($(button).data('loading-text'))
                    .prop('disabled', true)
                    .addClass('loading');
            }
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request == 'login.indicator.start') {
                        busyLoginButton();
                    }
                });

            /**
             * Reset the login indicator.
             */
            function resetButton() {
                var button = $('.login-button');
                $(button)
                    .html($(button).data('reset-text'))
                    .prop('disabled', false)
                    .removeClass('loading')
                    .removeClass('failed')
                    .removeClass('info')
                    .removeClass('temporary-text');
            }

            /**
             * Show an error on login fail.
             */
            function failedLoginButton() {
                var button = $('.login-button');
                $(button)
                    .html($(button).data('failed-text'))
                    .prop('disabled', false)
                    .addClass('failed')
                    .addClass('temporary-text');
            }
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request == 'login.failed') {
                        failedLoginButton();
                    }
                });

            /**
             * Show a message on logout.
             */
            function loggedOutButton() {
                var button = $('.login-button');
                $(button)
                    .html($(button).data('logout-text'))
                    .prop('disabled', false)
                    .addClass('info')
                    .addClass('temporary-text');
            }
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request == 'logout') {
                        hidePanel();
                        showLoginForm();

                        loggedOutButton();
                    }
                });

            // after login, show the user's e-mail address
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request.hasOwnProperty('login.success')) {
                        var user = request['login.success'].user;
                        $('#user-name').text(user.email);

                        hideLoginForm();
                        showPanel();
                    }
                });

            // spin refresh icon while reloading widgets
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request == 'mainpanel.refresh.start') {
                        $('#refresh').addClass('fa-spin');
                    } else if(request == 'mainpanel.refresh.stop') {
                        setTimeout(function() {
                            $('#refresh').removeClass('fa-spin');
                        }, 200);
                    }
                });

            /**
             * Capture icon clicks in the plugin container.
             */
            $('#logout').click(function(event) {
                chrome.runtime.sendMessage('logout.attempt');
            });
            $('#popout').click(function(event) {
                chrome.tabs.create({url: chrome.runtime.getURL('/data/panel/html/popout.html')});
            });
            $('#help').click(function(event) {
                chrome.runtime.sendMessage('help');
            });
            $('#refresh').click(function(event) {
                chrome.runtime.sendMessage('refresh');
            });
            $('#settings').click(function(event) {
                chrome.runtime.sendMessage('settings');
            });
            $('#close').click(function() {
                chrome.runtime.sendMessage('close');
                window.close();
            });

            // keep track whether this popup is open or closed
            storage.put('isMainPanelOpen', true);
            $(window).unload(function() {
                storage.put('isMainPanelOpen', false);
            });

            /**
             * default_popup (panel.html) is reloaded every time, so the only way to 'persist' the data
             * is by reading data from storage and present them as they were.
             */
            (function restore() {
                if(storage.get('user') && storage.get('username') && storage.get('password')) {
                    chrome.runtime.sendMessage('restore');

                    var user = storage.get('user');
                    $('#user-name').text(user.email);

                    hideLoginForm();
                    showPanel();
                } else {
                    console.info('no saved state');
                }
            })();
        });
    }
})();
