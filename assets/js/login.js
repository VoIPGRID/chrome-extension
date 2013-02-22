// Script for the login page

$(function() {
  var background = chrome.extension.getBackgroundPage();

  var updatehead = function(html) {
    $('#head').html(html);
  };

  var resetloginform = function() {
    $('#username').val('');
    $('#password').val('');
  };

  var errorcallback = function(response) {
    updatehead('Je gebruikersnaam en/of wachtwoord is onjuist.'); // 'Your username and/or password is incorrect.'
    resetloginform();
  };

  var donecallback = function() {
    $(".account").hide();
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
    background.doLogin($('#username').val(), $('#password').val(), donecallback, errorcallback);
  });

  $("#close").on("click", function() {
    window.close();
  });

});