(function() {
    'use strict';

    window.storage = {
        reset: function() {
            localStorage.clear();
        },
        get: function(key) {
            var value = localStorage.getItem(key);
            if(value) {
                return JSON.parse(value);
            }
            return null;
        },
        put: function(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        },
        remove: function(key) {
            if(storage.get(key)) {
                localStorage.removeItem(key);
            }
        },
    };
})();
