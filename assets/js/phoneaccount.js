/**
 * PhoneAccount Class
 * @constructor
 */
PhoneAccount = function() {

    this.generateHash = function(){
        return Math.random().toString(36).substring(2);
    }

    this.id = 0;
    this.impi = '';
    this.impu = '';
    this.entity = '';
    this.account_id = 0;
    this.callerid_name = '';
    this.callerid_number = '';
    this.description = '';
    this.internal_number = '';
    this.resource_uri = '';
    this.hash = this.generateHash();

    this.state = 'unavailable';

    var view = {
        state: $('<div>'),
        name: $('<span>'),
        extension: $('<span>')
    }

    this.updateView = function(){
         view.state.attr('class', 'status-icon ' + this.state);


         view.name.text(this.description);
         view.extension.text(this.internal_number);
    }
    
    this.update = function(args){
        for(var property in this){
            if(args.hasOwnProperty(property)){
                this[property] = args[property];
            }
        }

        this.updateView();
    }

    this.fromJSON = function(data) {
        this.update(data);

        this.impi = data.account_id.toString();
        this.impu = 'sip:'+ data.account_id + '@' + sipConfig['sip_realm'];

        return this;
    }

    this.renderTo = function(args){
        var elem = $('<li>', {'class': 'contact'});
        var state = $('<div>');
        var state_ico = $('<i>', {'class': 'icon-phone-sign'});
        var info = $('<div>', {'class': 'info'});
        var name = $('<div>', {'class': 'name'});
        var name_text = $('<span>');
        var extension = $('<div>', {'class': 'extension'});
        var extension_text = $('<span>');

        view.state = state;
        view.name = name_text;
        view.extension = extension_text;

        this.updateView();

        extension.append(extension_text);
        name.append(name_text);

        info.append(name).append(extension);
        state.append(state_ico);

        elem.append(state).append(info);
        elem.attr('rel', this.impi);

        args.append(elem);
    }

    this.updateState = function(args){
        this.state = args.state;
        this.updateView();
    }
}
