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
        resizeContacts();
        $(window).resize(resizeContacts);

        // hack in popout to display bottom border
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('widget.open')) {
                    if(request['widget.open'].name == 'contacts') {
                        $('.contacts .list .contact:visible:last').addClass('last');
                    }
                }
            });
    });
})();
