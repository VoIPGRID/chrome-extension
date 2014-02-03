(function() {
    'use strict';

    window.SIPconfig = {
        realm: 'test.voipgrid.nl:5060',
        impi: '123450001', // voip account code
        pass: 'abcdefghijklmnopqrstuvwxyz', // voip account password
        display_name: 'Demo account',
    };
    window.SIPconfig['impu'] = 'sip:' + window.SIPconfig['impi'] + '@' + window.SIPconfig['realm'];
})();
