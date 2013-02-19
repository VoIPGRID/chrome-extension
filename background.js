// Main script for the VoipGrid Chrome extension

var storage = localStorage;

var doLogin = function(user, pass) {
  storage.username = user;
  storage.password = pass;
};

window.doLogin = doLogin;