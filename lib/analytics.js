(function() {
    'use strict';

    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-60726618-9', 'auto');
    ga('set', 'checkProtocolTask', function(){});

    window.analytics = {
        /**
         * A function that will POST a Click-to-Dial Event to Google Analytics.
         *
         * Args:
         *      origin (string): Label that will be given to the event.
         */
        trackClickToDial: function (origin) {
            ga('send', 'event', 'Calls', 'Initiate ConnectAB', origin);
        }
    }
})();
