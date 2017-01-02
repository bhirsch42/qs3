<template>
  <div id="app">
    <div v-show="page == 'list'">
      <div v-for="playing in nowPlaying">
        <div class="song">
          <div class="title">{{ playing.song.title }}</div>
          <canvas width="1280" height="200" style="border: 1ps solid black;" v-draw-waveform="playing"></canvas>
          <div class="fading" v-if="playing.fadingIn">
            Fading in
          </div>
          <div class="fading" v-if="playing.fadingOut">
            Fading out
          </div>
        </div>
      </div>
    </div>
    <div id="slab" v-if="page == 'slab'">
      <span>{{ slabtext }}</span>
    </div>
  </div>
</template>

<script>
import Hello from './components/Hello'
import io from 'socket.io-client'
import WaveSurfer from 'wavesurfer.js'
import _ from 'lodash'

require('Howler');

var serverUrl = 'http://' + location.host.split(location.port)[0] + '8080'
var socket = io.connect(serverUrl);
var library = {};
var waveforms = {};

var data = {
  nowPlaying: [],
  count: 0,
  page: 'list',
  slabtext: '',
  waveforms
}

// So far, this just gets the incompetech songs
socket.emit('controller to server', {command: "get incompetech data"})
socket.on('server to controller - songData', (response) => {
  response.forEach((o, i) => {
    library[o.title] = o;
  });
});

// So far, this just gets the incompetech waveforms
socket.on('server to controller - waveforms', (response) => {
  data.waveforms = response;
});

var stopSong = (playing, fade) => {
  playing.fadingOut = true;
  if (fade) {
    playing.song.audio.fade(1, 0, fade, playing.id);
  } else {
    playing.song.audio.stop(playing.id);
  }
}

var playSong = (song, fade) => {
  if (fade) {
    song.audio.volume(0);
  } else {
    stopAll();
  }
  let playing = {
    song: song,
    id: song.audio.play(),
    fadingIn: false,
    fadingOut: false
  }
  data.nowPlaying.push(playing)
  if (fade) {
    playing.fadingIn = true;
    song.audio.fade(0, 1, fade, playing.id)
  }
}

var stopAll = () => {
  data.nowPlaying.forEach((playing) => {
    stopSong(playing);
  })
}

var fadeOutAll = (duration) => {
  data.nowPlaying.forEach((playing) => {
    stopSong(playing, duration);
  })
}

var countInSong = (song) => {
  let tempo = song.tempo || 60;
  let delay = 1000 * 60 / tempo;
  let words = ['1', '...', '2', '...', '1', '2', '3', '4'];
  var count = (n, words, delay, song) => {
    if (n == words.length) {
      playSong(song);
      data.slabtext = '';
      data.page = 'list';
      return;
    }
    data.slabtext = words[n];
    setTimeout(() => {
      count(n + 1, words, delay, song)
    }, delay)
  }
  data.page = 'slab'

  count(0, words, delay, song);
}

var loadAndPlay = (title, countIn, fade) => {
  let song = library[title];
  if (!song.audio) {
    song.audio = new Howl({
      title: title,
      src: `${serverUrl}/static/incompetech_songs/${song.filename}`,
      ext: [song.filename.split('.')[1]],
      html5: true,
      onfade: (id) => {
        let playing = _.find(data.nowPlaying, {id: id});
        if (playing.fadingOut) {
          playing.song.audio.stop();
        }
        playing.fadingIn = false;
      },
      onstop(id) {
        data.nowPlaying = _.filter(data.nowPlaying, (playing) => {
          return playing.id != id;
        })
      }
    })
  }
  song.audio.volume(1);
  if (!countIn) {
    playSong(song, fade);
  } else {
    countInSong(song)
  }
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
    loadAndPlay(args.title, args.countIn);
  },
  fadeIn(args) {
    fadeOutAll(args.duration * 1000);
    loadAndPlay(args.title, args.countIn, args.duration * 1000);
  },
  fadeOut(args) {
    fadeOutAll(args.duration * 1000);
  },
  stop(args) {
    stopAll(args);
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
  },
  directives: {
    drawWaveform(canvasElement, binding) {
      let playing = binding.value
      let waveform = data.waveforms[playing.song.title];

      if (waveform.length < 5) {
        return;
      }

      let ctx = canvasElement.getContext("2d");
      let width = canvasElement.width;
      let height = canvasElement.height;
      let barWidth = width / waveform.length;

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "green";
      waveform.forEach((peak, i) => {
        ctx.fillRect(i * barWidth, height/2 - height*peak/2, barWidth, height * peak);
      })
      setInterval(() => {
        let position = playing.song.audio.seek();
        let duration = playing.song.audio.duration();
        let i = position / duration * width;
        ctx.fillStyle = "red";
        ctx.fillRect(i, 0, barWidth, height);
        ctx.fillStyle = "yellow";
        let peak = waveform[parseInt(position / duration * waveform.length)]
        ctx.fillRect(i, height/2 - height*peak/2, 1, height * peak);
      }, 30)
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  margin-top: 10px;
}

body, html {
  color: white;
  background-color: black;
}

#slab {
  width: 100vw;
  height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 90vh;
}

.title {
  font-size: 15vh;
}

.fading {
  font-size: 15vh;
  color: gray;
}

</style>
