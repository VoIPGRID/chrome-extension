(function() {
    'use strict';

    window.widgets = {};

    $(function() {
        var defaults = {
            platformUrl: 'https://partner.voipgrid.nl/',
            c2d: 'true',
        };

        for(var key in defaults) {
            if(defaults.hasOwnProperty(key)) {
                if(storage.get(key) === null) {
                    storage.put(key, defaults[key]);
                }
            }
        }

        console.info('current storage:');
        for(var i = 0; i < localStorage.length; i++) {
            console.info(localStorage.key(i)+'='+localStorage.getItem(localStorage.key(i)));
        }

        // keep track of some notifications
        storage.put('notifications', {});
        panels.MainPanel(widgets);

        // continue last session if credentials are available
        if(storage.get('user') && storage.get('username') && storage.get('password')) {
            for(var widget in widgets) {
                // use 'load' instead of 'restore' to refresh the data on browser restart
                widgets[widget].load();
            }

            // look for phone numbers in tabs from now on
            page.init();
        }
    });

    window.post_login = function(user) {
        console.info('login.success');

        chrome.runtime.sendMessage({'login.success': {user: user}});

        // reset seen notifications
        var notificationsData = storage.get('notifications');
        notificationsData['unauthorized'] = false;
        storage.put('notifications', notificationsData);

        // start loading the widgets
        panels.refreshWidgets(false);

        // look for phone numbers in tabs from now on
        page.init();
    };

    window.logout = function() {
        console.info('logout');

        chrome.runtime.sendMessage('logout');

        storage.remove('user');
        panels.resetStorage();
        panels.resetWidgets();
        page.reset();
        storage.remove('username');
        storage.remove('password');
    };
})();
