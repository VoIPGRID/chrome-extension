(function() {
    'use strict';

    $(function() {
        (function restore() {
            var platformUrl = storage.get('platformUrl');
            $('#platformUrl').val(platformUrl);

            var c2d = storage.get('c2d');
            if(c2d) {
                $('#c2d').attr('checked', 'checked');
            } else {
                $('#c2d').removeAttr('checked');
            }
        })();

        function save() {
            $('input').each(function(index, input) {
                if($(input).attr('type') == 'checkbox' || $(input).attr('radio')) {
                    storage.put($(input).attr('id'), $(input).is(':checked'));
                } else {
                    storage.put($(input).attr('id'), $(input).val());
                }
            });

            $('.message').text(translate('optionsSaveText')).show();

            setTimeout(function() {
                $('.message').fadeOut(1000, function() {
                    $('.message').text('').show();
                });
            }, 2000);
        }
        $('.save').click(save);
    });
})();
