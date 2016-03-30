(function() {
    'use strict';

    // hardcoded blacklist of sites because there is not yet a solution
    // that works for chrome and firefox using exclude site-urls.
    //
    // these sites are blocked primarily because they are javascript-heavy
    // which in turn leads to 100% cpu usage when trying to parse all the
    // mutations for too many seconds making it not responsive.
    //
    // the content script still tracks <a href="tel:xxxx"> elements.
    var blacklist = [
        '^chrome',
        // we prefer not to add icons in documents
        '^https?.*docs\\.google\\.com.*$',
        '^https?.*drive\\.google\\.com.*$',

        // pages on these websites tend to grow too large to parse them in a reasonable amount of time
        '^https?.*bitbucket\\.org.*$',
        '^https?.*github\\.com.*$',
        '^https?.*rbcommons\\.com.*$',

        // this site has at least tel: support and uses javascript to open a new web page
        // when clicking the anchor element wrapping the inserted icon
        '^https?.*slack\\.com.*$',
    ];

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
                        if(storage.get('user')) {
                            // when the contentScriptFiles are loaded this event is sent
                            if(request == 'page.observer.ready') {
                                if(storage.get('c2d')) {
                                    // test for blacklisted sites
                                    var blacklisted = false;
                                    for(var i = 0; i < blacklist.length; i++) {
                                        if(new RegExp(blacklist[i]).test(sender.tab.url)) {
                                            blacklisted = true;
                                            break;
                                        }
                                    }

                                    if (blacklisted) {
                                        console.info('not observing because this site is blacklisted: ' + sender.tab.url);
                                        sendResponse({'observe': false});
                                    } else {
                                        console.info('observing: ' + sender.tab.url);
                                        sendResponse({'observe': true});
                                    }
                                } else {
                                    console.info('not observing because icons are disabled: ' + sender.tab.url);
                                    sendResponse({'observe': false});
                                }
                            }
                            // dial given number
                            else if(request.hasOwnProperty('clicktodial.dial')) {
                                // block chrome pages
                                if(new RegExp('^chrome').test(sender.tab.url) &&
                                        sender.tab.url != chrome.runtime.getURL('data/panel/html/panel.html') &&
                                        sender.tab.url != chrome.runtime.getURL('data/panel/html/popout.html')
                                ) {
                                    return;
                                }

                                clicktodial.dial(request['clicktodial.dial'].b_number, sender.tab);
                            }
                        } else {
                            console.info('not observing because user is not logged in: ' + sender.tab.url);
                            sendResponse({'observe': false});
                        }
                    }
                });

            // add context menu item to dial selected number
            contextMenuItem = chrome.contextMenus.create({
                title: translate('contextMenuLabel'),
                contexts: ['selection'],
                onclick: function(info, tab) {
                    clicktodial.dial(info.selectionText, tab);
                }
            });
        },
        reset: function() {
            if(contextMenuItem) {
                chrome.contextMenus.remove(contextMenuItem);
            }

            if(storage.get('c2d')) {
                chrome.tabs.query({}, function(tabs) {
                    tabs.forEach(function(tab) {
                        chrome.tabs.sendMessage(tab.id, 'page.observer.stop');
                    });
                });
            }
        }
    };
})();
