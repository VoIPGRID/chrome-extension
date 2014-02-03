(function() {
    'use strict';

    window.widgets = {};

    $(function() {
        storage.reset();

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
            console.info(localStorage.key(i)+"=["+localStorage.getItem(localStorage.key(i))+"]");
        }

        // keep track of some notifications
        storage.put('notifications', {});
        panels.MainPanel(widgets);

        // widgets initialization
        for(var widget in widgets) {
            widgets[widget].init();
        }
    });

    window.logout = function () {
        console.info('logout');

        chrome.runtime.sendMessage('logout');

        panels.resetWidgets();
        page.reset();
        storage.remove('user');
        storage.remove('username');
        storage.remove('password');
    };
})();
