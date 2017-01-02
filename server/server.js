var http = require('http');
var fs = require('fs');
var express = require('express'),
    app = module.exports.app = express();

var server = http.createServer(app);
var io = require('socket.io').listen(server);  //pass a http.Server instance
server.listen(8080);  //listen on port 8082

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.use('/static', express.static('./static'))

// app.get('/', function (req, res) {
//   res.sendfile(__dirname + '/index.html');
// });

io.on('connection', function (socket) {
  socket.on('player to controller', (data) => {
  	console.log('received player to controller', data)
  	io.emit('player to controller', data)
  })
  socket.on('controller to player', (data) => {
    console.log('received controller to player', data)
    io.emit('controller to player', data)
  })
  socket.on('controller to server', (data) => {
    console.log('received controller to server', data)
    fs.readFile('./static/incompetech_songs.json', (err, jsonStuff) => {
      socket.emit('server to controller - songData', JSON.parse(jsonStuff.toString()))
    });
    fs.readFile('./static/incompetech_waveforms.json', (err, jsonStuff) => {
      socket.emit('server to controller - waveforms', JSON.parse(jsonStuff.toString()))
    });
  })
});