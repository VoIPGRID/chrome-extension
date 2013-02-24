
// Saves options to localStorage.
function save_options() {
  var input = document.getElementById("url");
  var color = input.value;
  localStorage["url"] = color;

  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 750);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  var url = localStorage["url"];
  if (!url) {
    return;
  }
  var input = document.getElementById("url");
  input.value = url;
}
document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);
