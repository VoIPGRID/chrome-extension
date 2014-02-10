(function() {
    'use strict';

    window.cache['queue'] = {
        'list': [],
        'selected': null,
    };

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request == 'queues.reset') {
                var list = $('.queues .list');
                list.empty();
                $('.queues .empty-list').addClass('hide');
            }
        });

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request == 'queues.empty') {
                $('.queues .empty-list').removeClass('hide');
            }
        });

    // fill the queue list
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request.hasOwnProperty('queues.fill')) {
                var queues = request['queues.fill'].queues;
                var selectedQueue = request['queues.fill'].selectedQueue;

                $('.queues .empty-list').addClass('hide');

                if(cache.queue.list == queues && cache.queue.selected == selectedQueue) {
                    // no changes so exit early
                    console.info('no new queue data');
                    return;
                }
                // update cache
                cache.queue.list = queues;
                cache.queue.selected = selectedQueue;

                // clear list
                var list = $('.queues .list');
                list.empty();

                // fill list
                var template = $('.queues .template .queue');
                $.each(queues, function(index, queue) {
                    var listItem = template.clone();
                    listItem.find('.indicator').text(queue.queue_size);
                    listItem.find('.text').text(queue.description);
                    listItem.find('.code').text('(' + queue.internal_number + ')');

                    // check if this queue is currently selected
                    if(selectedQueue && selectedQueue == queue.id) {
                        listItem.addClass('selected');
                    }

                    listItem.data('queue-id', queue.id);
                    listItem.find('.indicator')
                        .attr('id', 'size' + queue.id);

                    listItem.appendTo(list);
                });
            }
        });

    $(function($) {
        // select a queue
        $('.queues .list').on('click', '.queue', function(event) {
            var queueId = null;
            if($(this).data('queue-id')) {
                // toggle selection
                $(this).toggleClass('selected');
                $(this).siblings().removeClass('selected');

                if($(this).hasClass('selected')) {
                    queueId = $(this).data('queue-id');
                }
            }

            cache.queue.selected = queueId;
            chrome.runtime.sendMessage({'queue.select': {id: queueId}});
        });

        // update the size for a queue
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request.hasOwnProperty('queue.size')) {
                    var id = request['queue.size'].id;
                    var size = request['queue.size'].size;

                    if(isNaN(size)) {
                        size = '?';  // queue size is not available
                    }
                    $('#size' + id).text(size);
                }
            });
    });
})();
