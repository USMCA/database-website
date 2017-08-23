/*******************************************************************************
 *
 * Socket IO server. 
 *
 ******************************************************************************/

module.exports = function(server) {
  const io = require('socket.io')(server);

  io.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });

    socket.on('my other event', function(data) {
      console.log(data);
    });

    socket.on('ailee', function(data) {
      console.log(data);
    });
  });
}
