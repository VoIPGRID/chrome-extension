(function() {
    'use strict';

    var name = 'queues',
        queuecallgroups = [],
        sizes = {};

    widgets[name] = new (function() {
        var init = function() {
            // keep track of selected queue
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(request.hasOwnProperty('queue.select')) {
                        var id = request['queue.select'].id;
                        if(id) {
                            var size = NaN;
                            if(sizes && sizes.hasOwnProperty(id)) {
                                size = sizes[id];
                            }
                            chrome.browserAction.setIcon({path: getIconForSize(size)});
                        } else {
                            // restore availability icon
                            chrome.browserAction.setIcon({path: storage.get('widgets').availability.icon})
                        }

                        // save selected queue id in storage
                        var widgetsData = storage.get('widgets');
                        widgetsData.queues.selected = id;
                        storage.put('widgets', widgetsData);

                        timer.update('queue.size');
                    }
                });
        };

        var load = function() {
            api.asyncRequest(
                api.getUrl('queuecallgroup'),
                null,
                'get',
                {
                    onComplete: function() {
                        chrome.runtime.sendMessage({'widget.indicator.stop': {name: name}});
                    },
                    onOk: function(response) {
                        // find the id's for queuecallgroups
                        var queues = response.objects;

                        var widgetsData = storage.get('widgets');
                        if(queues.length){
                            queuecallgroups = [];

                            queues.forEach(function(queue) {
                                queuecallgroups.push(queue.id);
                            });

                            chrome.runtime.sendMessage('queues.reset');
                            chrome.runtime.sendMessage({'queues.fill': {
                                queues: queues,
                                selectedQueue: storage.get('widgets').queues.selected
                            }});

                            // reset storage
                            sizes = {};
                            queues.forEach(function(queue) {
                                sizes[queue.id] = queue.queue_size;
                            });
                        } else {
                            chrome.runtime.sendMessage('queues.empty');
                        }

                        // save queues, sizes and ids in storage
                        widgetsData.queues.list = queues;
                        widgetsData.queues.queuecallgroups = queuecallgroups;
                        widgetsData.queues.sizes = sizes;
                        storage.put('widgets', widgetsData);

                        setQueueSizesTimer();
                    }
                }
            );
        };

        var reset = function() {
            chrome.runtime.sendMessage('queues.reset');
        };

        var restore = function() {
            console.info('reloading widget ' + name);

            // restore ids and sizes
            var widgetsData = storage.get('widgets');
            queuecallgroups = widgetsData.queues.queuecallgroups;
            sizes = widgetsData.queues.sizes;

            // restore queues list
            var queues = widgetsData.queues.list;
            if(queues.length){
                chrome.runtime.sendMessage('queues.reset');
                chrome.runtime.sendMessage({'queues.fill': {
                    queues: queues,
                    selectedQueue: widgetsData.queues.selected
                }});
            } else {
                chrome.runtime.sendMessage('queues.empty');
            }

            setQueueSizesTimer();
        };

        function getIconForSize(size) {
            var icon = 'data/widgets/assets/img/queue/queue.png';
            if(!isNaN(size)) {
                if(size < 10) {
                    icon = 'data/widgets/assets/img/queue/queue' + size + '.png';
                } else {
                    icon = 'data/widgets/assets/img/queue/queue10.png';
                }
            }
            return icon;
        }

        function setQueueSizesTimer() {
            function timerFunction() {
                if(queuecallgroups.length) {
                    queuecallgroups.forEach(function(id) {
                        api.asyncRequest(
                            // FIXME: the current limitation on the server of 20r/m will always reject some requests (status 503) in case of more than one queuecallgroup
                            api.getUrl('queuecallgroup') + id + '/',
                            null,
                            'get',
                            {
                                onOk: function(response) {
                                    var size = parseInt(response.queue_size, 10);
                                    if(isNaN(size)) {
                                        size = '?';  // queue size is not available
                                    }

                                    // update icon for toolbarbutton if this queuecallgroup was selected earlier
                                    if(response.id == storage.get('widgets').queues.selected) {
                                        chrome.browserAction.setIcon({path: getIconForSize(size)})
                                    }

                                    sizes[response.id] = size;
                                    chrome.runtime.sendMessage({'queue.size': {
                                        id: response.id,
                                        size: size
                                    }});

                                    // save sizes in storage
                                    var widgetsData = storage.get('widgets');
                                    widgetsData.queues.sizes = sizes;
                                    storage.put('widgets', widgetsData);
                                }
                            }
                        );
                    });
                }
            }

            // check for queue sizes on a variable timeout
            function timerTimeout() {
                var timeout = 0;

                // only when authenticated
                if(storage.get('user')) {
                    // at least every 20s when a queue is selected
                    if(storage.get('widgets').queues.selected) {
                        timeout = 20000;
                    }

                    // quicker if the panel is visible and the queues widget is open
                    if(storage.get('isMainPanelOpen')) {
                        if(storage.get('widgets').isOpen[name]) {
                            timeout = 5000;
                        }
                    }
                }

                console.info('timeout for queue.size: ' + timeout);
                return timeout;
            }

            timer.registerTimer('queue.size', timerFunction);
            timer.setTimeout('queue.size', timerTimeout, true);
            timer.startTimer('queue.size');
        }

        return {
            init: init,
            load: load,
            reset: reset,
            restore: restore,
        };
    })();
})();
