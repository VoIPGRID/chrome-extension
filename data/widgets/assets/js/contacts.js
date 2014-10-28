(function() {
    'use strict';

    var searchQuery = '';

    // blink every phone icon with class "ringing"
    var blink = function() {
        var ringingNow = $('.status-icon.ringing');
        $(ringingNow)
            .toggleClass('available')
            .toggleClass('busy');


        // add slight delay before shaking
        setTimeout(function() {
            $(ringingNow).filter('.ringing:not(.shake)')
                .each(function(index, element) {
                    // don't shake everything at the same time
                    setTimeout(function() {
                        $(element).addClass('shake');
                    }, (index * 200));
                });
        }, 400);
    };
    setInterval(blink, 400);

    var fade = function() {
        var icon = $('.connecting.connection-icon:visible');
        if($(icon).css('opacity') === '0') {
            icon.fadeTo(400, 1.0);
        } else {
            icon.fadeTo(400, 0);
        }
    };
    setInterval(fade, 1000);

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request == 'contacts.connecting') {
                console.info('contacts.connecting');

                $('.contacts .connection-icon').hide()
                    .filter('.connecting').css('display', 'inline-block');

                $('.contacts .status-icon')
                    .removeClass('available unavailable busy ringing shake');
            } else if(request == 'contacts.failed_to_start') {
                console.info('contacts.failed_to_start');

                $('.contacts .connection-icon').hide()
                    .filter('.no-connection').css('display', 'inline-block');
            } else if(request == 'contacts.connected') {
                console.info('contacts.connected');

                $('.contacts .connection-icon').hide();
            } else if(request == 'contacts.disconnected') {
                console.info('contacts.disconnected');

                $('.contacts .connection-icon').hide()
                    .filter('.connecting').css('display', 'inline-block');

                $('.contacts .status-icon')
                    .removeClass('available unavailable busy ringing shake');
            } else if(request.hasOwnProperty('contacts.sip')) {
                console.info('contacts.sip');

                var account_id = request['contacts.sip'].account_id;
                var state = request['contacts.sip'].state;
                $('#sip' + account_id + ' .status-icon')
                    .removeClass('available unavailable busy ringing shake')
                    .addClass(state);
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

                // hack in popout to display bottom border
                $('.contacts .list .contact:visible:last').addClass('last');

                // trigger the callback function to receive presence data
                // after the list is fully built
                sendResponse({});

                // hide element
                $('embed').hide();
            }
        });

    $(function() {
        // call an available contact
        $('.contacts').on('click', '.status-icon', function() {
            var extension = $(this).closest('.contact').find('.extension').text();
            if(extension && extension.length) {
                chrome.runtime.sendMessage({'panel.dial': {'b_number': extension}});
            }
        });

        // search form
        $('.search-form :input')
            // search while typing
            .keyup(function(){
                searchQuery = $(this).val().trim().toLowerCase();

                var list = $('.contacts .list');
                $(list).find('.contact.last').removeClass('last');

                // filter list
                $.each($('.contacts .list .contact'), function(index, contact) {
                    // hide contact if not a match
                    if($(contact).find('.name').text().toLowerCase().indexOf(searchQuery) == -1 &&
                            $(contact).find('.extension').text().toLowerCase().indexOf(searchQuery) == -1) {
                        $(contact).addClass('hide');
                    } else {
                        $(contact).removeClass('hide');
                    }
                });

                // show a message if no contacts matched
                if($('.contacts .list .contact:visible').length) {
                    $('.widget.contacts .list').css('overflow-x', 'auto');
                    $('.widget.contacts .not-found-contacts').addClass('hide');
                    // hack in popout to display bottom border
                    $('.contacts .list .contact:visible:last').addClass('last');
                } else {
                    $('.widget.contacts .list').css('overflow-x', 'hidden');
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
