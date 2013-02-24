// Main script for the VoipGrid Chrome extension

var storage = localStorage;

const userdestinationresource = "userdestination";
const queueresource = 'queuecallgroup';
const selecteduserdestinationresource = 'selecteduserdestination';
const userdestinationresource = 'userdestination';

var platform_url = "https://client.voys.nl/";

var selected_fixed = null;
var selected_phone = null;
var selecteduserdestination_id = '';

var callgroup_ids = new Array();
var client_id = '';

var user_id = '';

var queue_timer = '';

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

var loggedOut = function(panel) {
  delete storage.username;
  delete storage.password;
  client_id = '';
  user_id = '';
  selecteduserdestination_id = '';
  clearInterval(queue_timer);
  chrome.browserAction.setIcon({path: 'assets/img/call-gray.png'})
  if (panel.errorcallback) {
    panel.errorcallback()
    panel.showLogin()
    panel.updatehead('Uitgelogd');
  }
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
          loggedOut(panel);
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
                panel.enableuserdestinations();
            }
            if (selected_fixed == null && selected_phone == null) {
              chrome.browserAction.setIcon({path: 'assets/img/call-red.png'})
            } else {
              chrome.browserAction.setIcon({path: 'assets/img/call-green.png'})
            }
            panel.updatehead(html);
            // the user destinations have been loaded succesfully. we may fetch the queue list now.
            loadqueuedata(panel, base64auth);
            panel.updatehead(username);
            panel.updatestatus(html);
            // Show the new popup
            if (panel.donecallback) {
              panel.donecallback();
            }
        }
      });
      request.fail(function(jqXHR, textStatus) {
        if (jqXHR.status == 401) {
          loggedOut(panel);
        }
      });
  } else {
    panel.showLogin();
  }
}

/* fills the queue list with queue sizes */
function getqueuesizes(panel) {
    var username = storage.username;
    var password = storage.password;
    if (username && password) {
      var base64auth = 'Basic ' + btoa(username + ':' + password);
      for (var i in callgroup_ids) {
        var request = $.ajax({
          url: platform_url + 'api/' + queueresource + '/' + callgroup_ids[i] + '/',
          dataType: 'json',
          settings: {
            accepts: 'application/json',
            contentType: 'application/json'
          },
          headers: {
            Authorization: base64auth
          }
        });

        // do a request for each callgroup
        request.done(function(response) {
          // update list item for this specific callgroup
          var queue_size = response.queue_size;
          var number = parseInt(queue_size);
          if (isNaN(number)) {
              queue_size = '?'; // queue size is not available
          }
          if (response.id == storage.primary) {
              var filename = 'assets/img/queue10.png';
              if (isNaN(number)) {
                  filename = 'assets/img/queue.png';
              }
              else if (number < 10) {
                  filename = 'assets/img/queue' + number + '.png';
              }
              chrome.browserAction.setIcon({path: filename})
           }
           if (panel) {
             panel.updatequeuesize(queue_size, response.id);
           }
        });
      }
    }
    else {
      chrome.browserAction.setIcon({path: 'assets/img/call-gray.png'})
    }
};

/* fetches queue info and loads them into the list on the main panel */
function loadqueuedata(panel, base64auth) {
    var request = $.ajax({
      url: platform_url + 'api/' + queueresource + '/',
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
          var queues = response.objects;
          // no queues, no list
          if (queues.length == 0) {
              html = '<ul><li>Je hebt momenteel geen wachtrijen.</li></ul>'; // 'You have no queues at the moment.'
          }
          // build html list for queue info
          else {
              callgroup_ids = new Array();
              html = '<ul>'
              for (var i in queues) {
                  q = queues[i];
                  var selected = '';
                  if (q.id == storage.primary) {
                      selected = ' class="selected"';
                  }
                  html += '<li title="' + q['id'] + '"' + selected + '><span class="indicator" id="size' + 
                          q['id'] + '" title="' + q['id'] + '">?</span> ' + q['description'] + 
                          ' <span class="code">(' + q['internal_number'] + ')</span></li>';
                  callgroup_ids.push(q.id);
              }
              html += '<ul>'
          }
          panel.updatelist(html);
          getqueuesizes(panel);
          queue_timer = setInterval(getqueuesizes, 5000);
    });
    request.fail(function(jqXHR, textStatus) {
      if (jqXHR.status == 401) {
        loggedOut(panel);
      }
    });
}

var setprimary = function(panel, id) {
  storage.primary = id;
  getqueuesizes(panel);
  clearInterval(queue_timer);
  queue_timer = setInterval(getqueuesizes, 5000);
  if (id == '') {
    if (selected_fixed == null && selected_phone == null) {
      chrome.browserAction.setIcon({path: 'assets/img/call-red.png'})
    } else {
      chrome.browserAction.setIcon({path: 'assets/img/call-green.png'})
    }
  }
};

var setuserdestination = function(value) {
  // on selecting the 'no' radio button, set the selected userdestination to None.
  if(value == null) {
      selectuserdestination_internal(null, null);
  }
  // on selecting 'yes', set the userdestination to the value of the userdestination select input.
  else {
      selectuserdestination_internal(value.split('-')[0], value.split('-')[1]);
  }
};

var selectuserdestination = function(value) {
  selectuserdestination_internal(value.split('-')[0], value.split('-')[1]);
};

/* sets the selected userdestination to the provided type and id */
var  selectuserdestination_internal = function(type, id) {
    var username = storage.username;
    var password = storage.password;
    if (username && password) {
        var base64auth = 'Basic ' + btoa(username + ':' + password);
        selected_fixed = null;
        selected_phone = null;
        if (type == 'fixed') {
            selected_fixed = id;
        } else if(type == 'phone') {
            selected_phone = id;
        }
         var request = $.ajax({
          url: platform_url + 'api/' + selecteduserdestinationresource + '/' + selecteduserdestination_id + '/',  
          dataType: 'json',
          data: '{\"fixeddestination\": ' + selected_fixed + ', \"phoneaccount\": ' + selected_phone + '}',
          settings: {
            accepts: 'application/json',
            contentType: 'application/json'
          },
          headers: {
            Authorization: base64auth
          },
          type: 'PUT'
        });
        clearInterval(queue_timer);
        queue_timer = setInterval(getqueuesizes, 5000);
        if (id == null) {
          chrome.browserAction.setIcon({path: 'assets/img/call-red.png'})
        }
        else {
          chrome.browserAction.setIcon({path: 'assets/img/call-green.png'})
        }
    }
};

// Exported values
window.doLogin = doLogin;
window.loggedOut = loggedOut;
window.openHelp = openHelp;
window.openSettings = openSettings;
window.loadpaneldata = loadpaneldata;
window.setprimary = setprimary;
window.setuserdestination = setuserdestination;
window.selectuserdestination = selectuserdestination;

window.selected_fixed = selected_fixed;
window.selected_phone = selected_phone;
window.selecteduserdestination_id = selecteduserdestination_id;

window.client_id = client_id;

window.user_id = user_id;

