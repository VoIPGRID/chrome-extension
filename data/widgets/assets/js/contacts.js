(function() {
    'use strict';

    var storage;

    try {
        var backgroundPage = chrome.extension.getBackgroundPage();
        contacts(backgroundPage);
    } catch(Exception) {
        chrome.runtime.getBackgroundPage(contacts);
    }

    window.cache['contacts'] = {
        'list': [],
    };

    function contacts(backgroundPage) {
        storage = backgroundPage.storage;

        var searchQuery = '',
            phoneAccounts = [],
            subscribedTo = {};

        var blink = function() {
           $('.status-icon.ringing')
            .toggleClass('available')
            .toggleClass('busy');
        };
        setInterval(blink, 300);

        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request == 'contacts.reset') {
                    var list = $('.contacts .list');
                    list.empty();
                    $('.widget.contacts .empty-list').addClass('hide');

                    if(!storage.get('user')) {
                        searchQuery = '';
                        phoneAccounts = [];
                        subscribedTo = {};
                    }
                }
            });

        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request == 'contacts.empty') {
                    $('.widget.contacts .empty-list').removeClass('hide');
                    $('.contacts .search-query').attr('disabled', 'disabled');
                }
            });

        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                // fill the contact list
                if(request.hasOwnProperty('contacts.fill')) {
                    var contacts = request['contacts.fill'].contacts;

                    $('.widget.contacts .empty-list').addClass('hide');
                    $('.contacts .search-query').removeAttr('disabled');

                    if(cache.contacts.list == contacts) {
                        // no changes so exit early
                        console.info('no new contacts');
                        return;
                    }
                    // update cache
                    cache.contacts.list = contacts;

                    // clear list
                    var list = $('.contacts .list');
                    list.empty();

                    // fill list
                    var template = $('.contacts .template .contact');
                    $.each(contacts, function(index, contact) {
                        var listItem = template.clone();
                        listItem.attr('id', 'sip' + contact.account_id);
                        listItem.find('.name').text(contact.description);
                        listItem.find('.extension').text(contact.internal_number);

                        listItem.appendTo(list);
                    });
                }
            });

        // subscribe to presence updates for account_id
        function subscribe(account_id) {
            var presenceCallback = function(impu, state) {
                console.info('contacts.updatePresence');

                var match = impu.match(/(.*)@/g);
                if(match.length) {
                    var start_pos = 0;
                    if(match[0].indexOf('sip:') === 0) {
                        start_pos = 4;
                    }
                    var selector = match[0].substring(start_pos, match[0].length-1);
                    $('#sip' + selector).find('.status-icon')
                        .removeClass('available unavailable busy ringing')
                        .addClass(state);

                    if(subscribedTo[account_id]) {
                        subscribedTo[account_id]['state'] = state;  // update cached presence
                    }
                }
            };

            // remember subscribed accounts and its state at the time of an update
            subscribedTo[account_id] = {
                state: null,
            };

            var impu = 'sip:'+ account_id + '@' + window.SIPconfig['realm'];
            window.SIP.subscribe(impu, presenceCallback);
        }

        // stop receiving presence updates for account_id
        function unsubscribe(account_id) {
            var impu = 'sip:'+ account_id + '@' + window.SIPconfig['realm'];
            window.SIP.unsubscribe(impu);
            delete subscribedTo[account_id];
        }

        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                // start polling for presence information
                if(request.hasOwnProperty('sip.init')) {
                    var readyCallback = function(event) {
                        var connectedCallback = function() {
                            $.each(cache.contacts.list, function(index, contact) {
                                subscribe(''+contact.account_id);
                            });
                        };
                        window.SIP.init({connected: connectedCallback});
                        window.SIP.start();
                    };
                    var errorCallback = function(event) {
                        console.error('Failed to initialize the engine: ' + event.message);
                    };

                    if(window.SIPml.isInitialized()) {
                        console.info('SIPml already initialized, calling readyCallback immediately');
                        readyCallback();
                    } else {
                        var email = request['sip.init'].email;
                        var token = request['sip.init'].token;

                        // update impi, pass and impu for SIP
                        window.SIPconfig['impi'] = email;
                        window.SIPconfig['pass'] = token;
                        window.SIPconfig['impu'] = 'sip:' + window.SIPconfig['impi'] + '@' + window.SIPconfig['realm'];

                        window.SIPml.init(readyCallback, errorCallback);
                        window.SIPml.setDebugLevel('warn');  // supported values: info, warn, error and fatal.
                    }

                    // hide sip element
                    $('embed').hide();
                }
            });

        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if(request == 'sip.update') {
                    console.info('sip.update');

                    var cachedAccountIds = [];
                    $.each(cache.contacts.list, function(index, contact) {
                        cachedAccountIds.push(''+contact.account_id);
                    });

                    // subscribe to accounts previously not in the list
                    var toSubscribe = $(cachedAccountIds).not(Object.keys(subscribedTo)).get();
                    $.each(toSubscribe, function(index, account_id) {
                        subscribe(account_id);
                    });

                    // unsubscribe from accounts no longer in the list
                    var toUnsubscribe = $(Object.keys(subscribedTo)).not(cachedAccountIds).get();
                    $.each(toUnsubscribe, function(index, account_id) {
                        unsubscribe(account_id);
                    });

                    // restore state from before the update
                    $.each(Object.keys(subscribedTo), function(index, account_id) {
                        $('#sip' + account_id).find('.status-icon')
                            .removeClass('available unavailable busy ringing')
                            .addClass(subscribedTo[account_id]['state']);
                    });
                }
            });

        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                // start polling for presence information
                if(request == 'sip.start') {
                    if(window.SIP) {
                        window.SIP.start();
                    }
                }
            });

        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                // stop polling for presence information
                if(request == 'sip.stop') {
                    if(window.SIP) {
                        window.SIP.stop();
                    }
                }
            });

        $(function() {
            // call an available contact
            $('.contacts').on('click', '.status-icon.available:not(.ringing)', function() {
                var extension = $(this).closest('.contact').find('.extension').text();
                if(extension && extension.length) {
                    chrome.runtime.sendMessage({'clicktodial.dial': {'b_number': extension, 'silent': true}});
                }
            });

            // search form
            $('.search-form :input')
                // search while typing
                .keyup(function(){
                    searchQuery = $(this).val().trim().toLowerCase();

                    var list = $('.contacts .list');

                    // filter list
                    $.each($('.contacts .contact'), function(index, contact) {
                        // hide contact if not a match
                        if($(contact).find('.name').text().toLowerCase().indexOf(searchQuery) == -1 && $(contact).find('.extension').text().toLowerCase().indexOf(searchQuery) == -1) {
                            $(contact).addClass('hide');
                        } else {
                            $(contact).removeClass('hide');
                        }
                    });

                    // show a message if no contacts matched
                    if($('.contacts .contact:visible').length) {
                        $('.widget.contacts .not-found-contacts').addClass('hide');
                    } else {
                        $('.widget.contacts .not-found-contacts').removeClass('hide');
                    }

                    window.resize();
                })
                // don't submit this form on enter
                .keydown(function(e){
                    if(e.which === 13) {
                        e.preventDefault();
                    }
                });
        });
    }
})();
