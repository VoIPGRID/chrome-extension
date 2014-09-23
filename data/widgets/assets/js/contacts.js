(function() {
    'use strict';

    var searchQuery = '';

    // blink every phone icon with class "ringing"
    var blink = function() {
       $('.status-icon.ringing')
        .toggleClass('available')
        .toggleClass('busy');
    };
    setInterval(blink, 300);

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request.hasOwnProperty('contacts.sip')) {
                console.info('contacts.sip');

                var impu = request['contacts.sip'].impu;
                var state = request['contacts.sip'].state;
                var match = impu.match(/(.*)@/g);
                if(match.length) {
                    var start_pos = 0;
                    if(match[0].indexOf('sip:') === 0) {
                        start_pos = 4;
                    }
                    var selector = '#sip' + match[0].substring(start_pos, (match[0].length - 1));
                    console.log('adding class', state);
                    $(selector).find('.status-icon')
                        .removeClass('available unavailable busy ringing')
                        .addClass(state);
                }
            }
        });

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request == 'contacts.reset') {
                var list = $('.contacts .list');
                list.empty();
                $('.widget.contacts .empty-list').addClass('hide');

                // reset search
                searchQuery = '';
                $('.search-form :input').val(searchQuery);
                $('.widget.contacts .contact').removeClass('hide');
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

                // trigger the callback function to receive presence data
                // after the list is fully built
                sendResponse({});
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
            })
            // don't submit this form on enter
            .keydown(function(e){
                if(e.which === 13) {
                    e.preventDefault();
                }
            });
    });
})();
