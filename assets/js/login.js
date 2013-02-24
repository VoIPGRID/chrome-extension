// Script for the login page

$(function() {
  var background = chrome.extension.getBackgroundPage();

  // close all widgets with data-opened="false"
  $('.widget[data-opened="false"] .widget-content').hide();

  // a widget header click will minimize/maximize the widget's panel
  $('.widget .widget-header').on('click', function() {
      // check if it's closed or opened
      if($(this).parent().data('opened') === true) {
          $(this).parent()
                  .data('opened', false)
                  .attr('data-opened', 'false')
                  .find('.widget-content').hide(200);
      }
      else {
          // hide the scrollbar while resizing
          $('html').addClass('scrollbarhide');
          $(this).parent()
                  .data('opened', true)            
                  .attr('data-opened', 'true')
                  .find('.widget-content').show(200, function() {
                      // get back the scrollbar after resizing
                      $('body').removeClass('scrollbarhide');
                  });
      }
  });

  // update the heading which displays user info
  var updatehead = function(html) {
    $('#head').html(html);
  };

  var updatestatus = function(html) {
    $('#statusupdate').html(html);
  };

  var resetloginform = function() {
    $('#username').val('');
    $('#password').val('');
  };

  var enableuserdestinations = function() {
    $('#no').removeAttr('disabled');
    $('#yes').removeAttr('disabled');
  };

  var errorcallback = function() {
    updatehead('Je gebruikersnaam en/of wachtwoord is onjuist.'); // 'Your username and/or password is incorrect.'
    resetloginform();
  };

  var nouserdestinations = function() {
    $('#no').attr('checked', true);
    $('#no').attr('disabled', 'disabled');
    $('#yes').attr('disabled', 'disabled');
  };

  // update the list of queue callgroups
  var updatelist = function(html) {
    $('#queue').html(html);
  };

  // update the queue sizes in the list of queue callgroups
  var updatequeuesize = function(size, id) {
    $('#size' + id).html(size);
  };

  var panel = {
    nouserdestinations: nouserdestinations,
    errorcallback: errorcallback,
    updatehead: updatehead,
    updatestatus: updatestatus,
    updatelist: updatelist,
    updatequeuesize: updatequeuesize,
    enableuserdestinations: enableuserdestinations,
  }

  // widget select a li
  $('.widget.queues').on('click', 'li', function() {
      if($(this).attr('title') != undefined) {
          $(this).siblings().removeClass('selected');
          if($(this).attr('class') == 'selected') {
              $(this).removeClass('selected');
              background.setprimary(panel, '');
          }
          else {
              $(this).addClass('selected');
              background.setprimary(panel, $(this).attr('title'));
          }
      }
  }); 

  var donecallback = function() {
    $("#loginform").hide();
    $("#body").show();
    // TBD find a good size
    $('body').css('height', '200');
    $('body').css('width', '360');

    // Setup help button
    $("#help").on("click", function() {
      background.openHelp();
    })

    // Setup settings button
    $("#settings").on("click", function() {
      background.openSettings();
    })

    // Setup logout button
    $("#logout").on("click", function() {
      background.loggedOut(panel);
    })
  };

  panel.donecallback = donecallback;

  var showLogin = function() {
    $("#loginform").show();
    $("#body").hide();

    // Handler for the login button
    $("#login").on("click", function() {
      background.doLogin($('#username').val(), $('#password').val(), panel);
    });
  }

  panel.showLogin = showLogin;

  $("#close").on("click", function() {
    window.close();
  });

  $("#body").hide();
  $("#loginform").hide();

  background.loadpaneldata(panel);
});