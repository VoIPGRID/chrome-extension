// Main script for the VoipGrid Chrome extension

var storage = localStorage;

var doLogin = function(user, pass, errorcallback) {
  storage.username = user;
  storage.password = pass;
  loadpaneldata(errorcallback);
};

var loggedOut = function() {
  storage.username = '';
  storage.password = '';
  // client_id = '';
  // user_id = '';
  // selecteduserdestination_id = '';
  // mainpanel.port.emit('updateform', loginform);
  // mainpanel.port.emit('updatelist', '');
  // mainpanel.port.emit('resizeonshow');
  // timer.clearInterval(queue_timer);
  // toolbarbutton.setIcon({url: data.url('assets/img/call-gray.png')});
}


const userdestinationresource = "userdestination";
var platform_url = "https://client.voys.nl/";

/* constructs select input of userdestinations and sets up queue list with a list of callgroups */
function loadpaneldata(errorcallback) {
  var username = storage.username;
  var password = storage.password;

  if (username && password) {
    var base64auth = 'Basic ' + btoa(username + ':' + password);
    // fetch userdestination info
    var request = $.ajax({
      url: platform_url + 'api/' + userdestinationresource + '/',
      dataType: 'json',
      settings: {
        accepts: 'application/json',
        contentType: 'application/json'
      },
      headers: {
        Authorization: base64auth
      }
    });
    request.done(function(response) {
        var html = '';
        alert(response)

        var userdestinations = response.objects;
        if (userdestinations == null || userdestinations.length == 0) {
          loggedOut();
          if (errorcallback) {
            errorcallback(jqXHR)
          }
        } else {
            // construct select input of userdestinations
            client_id = userdestinations[0].client;
            user_id = userdestinations[0].user;
            selecteduserdestination_id = userdestinations[0].selecteduserdestination.id;
            selected_fixed = userdestinations[0].selecteduserdestination.fixeddestination;
            selected_phone = userdestinations[0].selecteduserdestination.phoneaccount;
            /*if(selected_fixed == null && selected_phone == null) {
                // set 'no' as selected radio input and disable statusupdate select input
                mainpanel.port.emit('noselecteduserdestination');
            }
            if (userdestinations.fixeddestinations.length == 0 && userdestinations.phoneaccounts.length == 0) {
                html = '<option>Je hebt momenteel geen bestemmingen.</option>'; // 'You have no destinations at the moment.'
                mainpanel.port.emit('nouserdestinations');
            } else {
                for (var i in userdestinations['fixeddestinations']) {
                    f = userdestinations['fixeddestinations'][i];
                    var selected = '';
                    if (f['id'] == selected_fixed) {
                        selected = ' selected="selected"';
                    }
                    html += '<option id="fixed-' + f['id'] + '" value="fixed-' + f['id'] + '"' + selected + 
                            '>+' + f['phonenumber'] + '/' + f['description'] +  '</option>';
                }
                for (var i in userdestinations['phoneaccounts']) {
                    p = userdestinations['phoneaccounts'][i];
                    var selected = '';
                    if (p['id'] == selected_phone) {
                        selected = ' selected="selected"';
                    }
                    html += '<option id="phone-' + p['id'] + '" value="phone-' + p['id'] + '"' + selected + 
                            '>' + p['internal_number'] + '/' + p['description'] +  '</option>';
                }
                // make sure the radio inputs are enabled
                mainpanel.port.emit('enableuserdestinations');
            }
            if (selected_fixed == null && selected_phone == null) {
                toolbarbutton.setIcon({url: data.url('assets/img/call-red.png')});
            } else {
                toolbarbutton.setIcon({url: data.url('assets/img/call-green.png')});
            }*/
            //mainpanel.port.emit('updateform', '');
            //mainpanel.port.emit('updatehead', username);
            //mainpanel.port.emit('updatestatus', html);
            // the user destinations have been loaded succesfully. we may fetch the queue list now.
            //loadqueuedata(base64auth);
            // Show the new popup
            chrome.browserAction.setIcon({path: 'assets/img/call-green.png'})
        }
      });
      request.fail(function(jqXHR, textStatus) {
        if (jqXHR.status == 401) {
          loggedOut();
          if (errorcallback) {
            errorcallback(jqXHR)
          }
        }
      });
  }
}

window.doLogin = doLogin;