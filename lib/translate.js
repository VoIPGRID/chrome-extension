/**
 * @inspiration: https://code.google.com/p/adblockforchrome/source/browse/trunk/functions.js
 */
(function() {
    'use strict';

    window.translate = function(messageID, args) {
        return chrome.i18n.getMessage(messageID, args);
    };
})();
