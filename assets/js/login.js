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
    $('body').css('height', '400');
    $('body').css('width', '400');
  };

  $("#body").hide();

  // Handler for the login button
  $("#login").on("click", function() {
    background.doLogin($('#username').val(), $('#password').val(), donecallback, errorcallback);
  });

});