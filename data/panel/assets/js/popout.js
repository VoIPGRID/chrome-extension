(function() {
    'use strict';

    $(function() {
        // force size for .contact,
        // useful in case of a popout and the list of contacts
        // is larger in size (height) than the viewport.
        function resizeContacts(reset) {
            var pluginWidth = $('.container').outerWidth();
            $('body.expand .contact').css('width', pluginWidth);
        }
        $(window).load(resizeContacts);
        $(window).resize(resizeContacts);
    });
})();
