(function() {
    'use strict';

    var contextMenuItem;

    window.page = {
        init: function() {
            console.info('page.init');

            // start looking for phone numbers in the page if
            // click to dial is enabled and the user is authenticated

            // for new tabs
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    if(sender.tab) {
                        if(storage.get('c2d') && storage.get('user')) {
                            if(sender.tab.url.indexOf('chrome') !== 0) {
                                // when the contentScriptFiles are loaded this event is sent
                                if(request == 'page.observer.ready') {
                                    console.info('observing: ' + sender.tab.url);
                                    chrome.tabs.sendMessage(sender.tab.id, 'page.observer.start');
                                }
                                // dial given number
                                else if(request.hasOwnProperty('clicktodial.dial')) {
                                    var b_number = request['clicktodial.dial'].b_number;
                                    clicktodial.dial(b_number, sender.tab);
                                }
                            } else {
                                console.info('not observing: ' + sender.tab.url);
                            }
                        }
                    }
                });

            // for open tabs
            if(storage.get('c2d') && storage.get('user')) {
                chrome.tabs.query({}, function(tabs) {
                    for (var i = 0; i < tabs.length; i++) {
                        if(tabs[i].url.indexOf('chrome') !== 0) {
                            console.info('observing: ' + tabs[i].url);
                            chrome.tabs.sendMessage(tabs[i].id, 'page.observer.start');
                        } else {
                            console.info('not observing: ' + tabs[i].url);
                        }
                    }
                });
            }

            // add context menu item to dial selected number
            contextMenuItem = chrome.contextMenus.create({
                title: 'Bel geselecteerde nummer', // 'Call selected number'
                contexts: ["selection"],
                onclick: function(info, tab) {
                    var number = info.selectionText.replace('(0)', '').replace(/[- \.\(\)]/g, '');
                    clicktodial.dial(number, tab);
                }
            });
        },
        reset: function() {
            if(contextMenuItem) {
                chrome.contextMenus.remove(contextMenuItem);
            }

            if(storage.get('c2d')) {
                chrome.tabs.query({}, function(tabs) {
                    for (var i = 0; i < tabs.length; i++) {
                        chrome.tabs.sendMessage(tabs[i].id, 'page.observer.stop');
                    }
                });
            }
        }
    };
})();
