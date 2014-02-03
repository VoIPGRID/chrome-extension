(function() {
    'use strict';

    $(function($) {
        // get the element for a widget by return the same (already a jquery) object or finding it by class name
        function getWidget(widgetOrWidgetName) {
            if(widgetOrWidgetName instanceof jQuery) {
                return widgetOrWidgetName;
            }
            return $('.widget.' + widgetOrWidgetName);
        }

        // return a boolean indicating whether widget is open
        function isWidgetOpen(widgetOrWidgetName) {
            var widget = getWidget(widgetOrWidgetName);
            return $(widget).data('opened') === true;
        }

        // open/close a widget's content and resize
        function openWidget(widgetOrWidgetName) {
            var widget = getWidget(widgetOrWidgetName);

            // cannot rely on just data.('opened') because this is not transparent to CSS
            $(widget).data('opened', true).attr('data-opened', true);
            $(widget).find('.widget-content').show(10);
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
            $(widget).find('.widget-content').hide(10);
        }
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('widget.close')) {
                    closeWidget(request['widget.close'].name);
                }
            });

        // when retrieving data for widget, display an indicator
        function busyWidget(widgetOrWidgetName) {
            var widget = getWidget(widgetOrWidgetName);
            $(widget).addClass('busy');
            closeWidget(widget);
        }
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('widget.indicator.start')) {
                    busyWidget(request['widget.indicator.start'].name);
                }
            });

        // reset the busy indicator and close a widget
        function resetWidget(widgetOrWidgetName) {
            var widget = getWidget(widgetOrWidgetName);
            $(widget).removeClass('busy');
            closeWidget(widget);
        }
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('widget.indicator.stop')) {
                    resetWidget(request['widget.indicator.stop'].name);
                }
            });

        // open/close the widget's content when clicking its header (except when it's busy)
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
