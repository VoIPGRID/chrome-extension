// Main script for the VoipGrid Chrome extension

var storage = localStorage;

const userdestinationresource = "userdestination";
var platform_url = "https://client.voys.nl/";

var selected_fixed = null;
var selected_phone = null;
var selecteduserdestination_id = '';

var client_id = '';

var user_id = '';

var doLogin = function(user, pass, panel) {
  storage.username = user;
  storage.password = pass;
  loadpaneldata(panel);
};

var openHelp = function() {
  chrome.tabs.create({url: 'http://wiki.voipgrid.nl/index.php/Firefox_plugin'});
};

var openSettings = function() {
  var url = platform_url + 'client/' + client_id + '/user/' + user_id + '/change/#tabs-3';
  chrome.tabs.create({url: url});
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

/* constructs select input of userdestinations and sets up queue list with a list of callgroups */
function loadpaneldata(panel) {
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

        var userdestinations = response.objects;
        if (userdestinations == null || userdestinations.length == 0) {
          loggedOut();
          if (panel.errorcallback) {
            panel.errorcallback(jqXHR)
          }
        } else {
          var ud = userdestinations[0];
            // construct select input of userdestinations
            client_id = ud.client;
            user_id = ud.user;
            selecteduserdestination_id = ud.selecteduserdestination.id;
            selected_fixed = ud.selecteduserdestination.fixeddestination;
            selected_phone = ud.selecteduserdestination.phoneaccount;
            if(selected_fixed == null && selected_phone == null) {
                // set 'no' as selected radio input and disable statusupdate select input
                if (panel.nouserdestinations) {
                  panel.nouserdestinations();
                }
            }
            if (ud.fixeddestinations.length == 0 && ud.phoneaccounts.length == 0) {
                html = '<option>Je hebt momenteel geen bestemmingen.</option>'; // 'You have no destinations at the moment.'
                panel.nouserdestinations();
            } else {
                for (var i in ud.fixeddestinations) {
                    f =ud.fixeddestinations[i];
                    var selected = '';
                    if (f.id == selected_fixed) {
                        selected = ' selected="selected"';
                    }
                    html += '<option id="fixed-' + f['id'] + '" value="fixed-' + f['id'] + '"' + selected + 
                            '>+' + f['phonenumber'] + '/' + f['description'] +  '</option>';
                }
                for (var i in ud.phoneaccounts) {
                    p = ud.phoneaccounts[i];
                    var selected = '';
                    if (p.id == selected_phone) {
                        selected = ' selected="selected"';
                    }
                    html += '<option id="phone-' + p['id'] + '" value="phone-' + p['id'] + '"' + selected + 
                            '>' + p['internal_number'] + '/' + p['description'] +  '</option>';
                }
                // make sure the radio inputs are enabled
                //mainpanel.port.emit('enableuserdestinations');
            }
            if (selected_fixed == null && selected_phone == null) {
              chrome.browserAction.setIcon({path: 'assets/img/call-red.png'})
            } else {
              chrome.browserAction.setIcon({path: 'assets/img/call-green.png'})
            }
            //mainpanel.port.emit('updateform', '');
            //mainpanel.port.emit('updatehead', username);
            //mainpanel.port.emit('updatestatus', html);
            console.log("Update head")
            console.log(html)
            panel.updatehead(html);
            // the user destinations have been loaded succesfully. we may fetch the queue list now.
            //loadqueuedata(base64auth);
            panel.updatehead(username);
            panel.updatestatus(html);
            // Show the new popup
            if (panel.donecallback) {
              panel.donecallback(username);
            }
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

// Exported values
window.doLogin = doLogin;
window.openHelp = openHelp;
window.openSettings = openSettings;

window.selected_fixed = selected_fixed;
window.selected_phone = selected_phone;
window.selecteduserdestination_id = selecteduserdestination_id;

window.client_id = client_id;

window.user_id = user_id;

