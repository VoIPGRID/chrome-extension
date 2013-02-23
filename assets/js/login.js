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

  var errorcallback = function(response) {
    updatehead('Je gebruikersnaam en/of wachtwoord is onjuist.'); // 'Your username and/or password is incorrect.'
    resetloginform();
  };

  var nouserdestinations = function() {
    $('#no').attr('checked', true);
    $('#no').attr('disabled', 'disabled');
    $('#yes').attr('disabled', 'disabled');
  };

  var donecallback = function(username) {
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
  };

  $("#body").hide();

  // Handler for the login button
  $("#login").on("click", function() {
    var panel = {
      nouserdestinations: nouserdestinations,
      donecallback: donecallback,
      errorcallback: errorcallback,
      updatehead: updatehead,
      updatestatus: updatestatus,
      enableuserdestinations: enableuserdestinations
    }
    background.doLogin($('#username').val(), $('#password').val(), panel);
  });

  $("#close").on("click", function() {
    window.close();
  });

});