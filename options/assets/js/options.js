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
                storage.put($(input).attr('id'), $(input).val());
            });

            $('.message').text('Instellingen opgeslagen.').show();

            setTimeout(function() {
                $('.message').fadeOut(1000, function() {
                    $('.message').text('').show();
                });
            }, 2000);
        }
        $('.save').click(save);
    });
})();
