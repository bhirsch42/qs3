<template>
  <div id="app">
    <div v-show="page == 'home'">
      <div v-for="item in nowPlaying">
        {{ item._src.split('/')[5].split('.')[0] }}
      </div>
    </div>
    <div id="countdown" v-show="page == 'countdown'">
      {{ count }}
    </div>
  </div>
</template>

<script>
import Hello from './components/Hello'
import io from 'socket.io-client'
require('Howler');
var serverUrl = 'http://' + location.host.split(location.port)[0] + '8080'
var socket = io.connect(serverUrl);
var library = {}

var data = {
  nowPlaying: [],
  count: 0,
  page: 'home'
}

// So far, this just gets the incompetech songs
socket.emit('controller to server', {command: "get incompetech data"})
socket.on('server to controller', (jsonStuff) => {
  jsonStuff.forEach((o, i) => {
    library[o.title] = o;
  });
});

var stopAll = () => {
  data.nowPlaying.forEach((o) => {
    o.stop();
  });
  data.nowPlaying = [];
}

var fadeOutAll = (duration) => {
  data.nowPlaying.forEach((o) => {
    o.fade(1, 0, duration);
  });
  setTimeout(stopAll, duration + 200)
}

var fadeInSong = (title, duration) => {
  let o = library[title];
  let howl = new Howl({
    title: title,
    src:`${serverUrl}/static/incompetech_songs/${o.filename}`,
    ext: [o.filename.split('.')[1]],
    autoplay: true,
    html5: true,
  });
  howl.volume(0);
  howl.fade(0, 1, duration);
  setTimeout(() => {
    data.nowPlaying.push(howl);  
  }, duration + 400);
}

var playSong = (title) => {
  let o = library[title];
  let howl = new Howl({
    title: title,
    src:`${serverUrl}/static/incompetech_songs/${o.filename}`,
    ext: [o.filename.split('.')[1]],
    autoplay: true,
    html5: true
  });
  data.nowPlaying.push(howl);  
}

var countdown = (delay, fn, args) => {
  data.page = 'countdown'
  var increment = (n, fn, args) => {
    data.count = n;
    if (n == 0) {
      fn(args);
      data.page = 'home';
      return;
    }
    setTimeout(() => {
      increment(n-1, fn, args);
    }, 1000)
  }
  increment(delay, fn, args);
}

var commands = {
  play(args) {
    var fn = (args) => {
      stopAll();
      playSong(args.title);
    }
    if (args.delay) {
      countdown(args.delay, fn, args);
    } else {
      fn(args);
    }
  },
  fadeIn(args) {
    fadeOutAll(args.duration * 1000);
    fadeInSong(args.title, args.duration * 1000);
  },
  fadeOut(args) {
    fadeOutAll(args.duration * 1000);
  },
  stop(args) {
    var fn = (args) => {
      stopAll();
    }
    if (args.delay) {
      countdown(args.delay, fn, args);
    } else {
      fn(args);
    }
  }
}

socket.on('controller to player', (message) => {
  if (message.command) {
    commands[message.command](message.args);
  }
});

export default {
  name: 'app',
  data() {
    return data;
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

#countdown {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: red;
  font-size: 100vh;
  font-weight: bold;
}

</style>
