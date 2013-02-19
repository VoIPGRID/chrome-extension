// Script for the login page

$(function() {
  $("#login").on("click", function() {
    var background = chrome.extension.getBackgroundPage();
    background.doLogin($('#username').val(), $('#password').val());
  });
});