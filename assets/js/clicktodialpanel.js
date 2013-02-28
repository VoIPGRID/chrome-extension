self.port.on('updatenumber', function(number) {
    $('#number').html(number);
});
self.port.on('updatestatus', function(status) {
    $('#status').html(status);
});
// handle button clicks
window.addEventListener('click', function(event) {
    if(event.target.id == 'close') {
        self.port.emit('close');
    }
}, false);
