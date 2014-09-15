(function() {
    'use strict';

    $(function($) {
        /**
         * Get the element for a widget by return the same (already a jquery)
         * object or finding it by class name.
         */
        function getWidget(widgetOrWidgetName) {
            if(widgetOrWidgetName instanceof jQuery) {
                return widgetOrWidgetName;
            }
            return $('.widget.' + widgetOrWidgetName);
        }

        /**
         * Return a boolean indicating whether widget is open.
         */
        function isWidgetOpen(widgetOrWidgetName) {
            var widget = getWidget(widgetOrWidgetName);
            return $(widget).data('opened') === true;
        }

        /**
         * Open/close a widget's content and resize.
         */
        function openWidget(widgetOrWidgetName) {
            var widget = getWidget(widgetOrWidgetName);

            // cannot rely on just data.('opened') because this is not transparent to CSS
            $(widget).data('opened', true).attr('data-opened', true);
            if(widget.hasClass('unauthorized')) {
                $(widget).find('.unauthorized-warning').show(10);
            } else {
                $(widget).find('.widget-content').show(10);
            }
        }
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('widget.open')) {
                    openWidget(request['widget.open'].name);
                }
            });
        function closeWidget(widgetOrWidgetName) {
            var widget = getWidget(widgetOrWidgetName);

            // cannot rely on just data.('opened')  because this is not transparent to CSS
            $(widget).data('opened', false).attr('data-opened', false);
            $(widget).find('.widget-content, .unauthorized-warning').hide(10);
        }
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('widget.close')) {
                    closeWidget(request['widget.close'].name);
                }
            });

        /**
         * When retrieving data for widget, display an indicator.
         */
        function busyWidget(widgetOrWidgetName) {
            var widget = getWidget(widgetOrWidgetName);
            var isOpen = isWidgetOpen(widget);
            resetWidget(widget);
            $(widget).addClass('busy');
        }
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('widget.indicator.start')) {
                    busyWidget(request['widget.indicator.start'].name);
                }
            });

        /**
         * Reset the busy indicator and close a widget.
         */
        function resetWidget(widgetOrWidgetName) {
            var widget = getWidget(widgetOrWidgetName);
            $(widget)
                .removeClass('busy')
                .removeClass('unauthorized');
            var isOpen = isWidgetOpen(widget);
            closeWidget(widget);
            if(isOpen) {
                openWidget(widget);
            }
        }
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('widget.indicator.stop')) {
                    resetWidget(request['widget.indicator.stop'].name);
                }
            });

        /**
         * Show the unauthorized warning for a widget.
         */
        function unauthorizeWidget(widgetName) {
            var widget = getWidget(widgetName);
            resetWidget(widget);
            widget.addClass('unauthorized');
        }
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('widget.unauthorized')) {
                    unauthorizeWidget(request['widget.unauthorized'].name);
                }
            });

        /**
         * Open/close the widget's content when clicking its header
         * (except when it's busy).
         */
        $('.container').on('click', '.widget:not(.busy) .widget-header', function(e) {
            var widget = $(this).closest('[data-opened]');
            if(isWidgetOpen(widget)) {
                if(!$(e.target).is(':input')) {
                    chrome.runtime.sendMessage({'widget.close': {
                        name: $(widget).data('widget'),
                    }});
                    closeWidget(widget);
                }
            } else {
                chrome.runtime.sendMessage({'widget.open': {
                    name: $(widget).data('widget'),
                }});
                openWidget(widget);
            }
        });
    });
})();
