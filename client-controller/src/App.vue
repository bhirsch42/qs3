<template>
  <div id="app">
    <div v-if="!fullscreen">
      <button v-on:click="goFullscreen">Fullscreen</button>   
    </div>
    <div v-if="fullscreen">
      <div class="fullscreen">

        <div id="home" v-show="page == 'home'">
          <div class="home-panel" id="home-search">
            <button v-on:click="clearFeels(); focusSearchBar();">Search by Name</button>
            <button v-on:click="page = 'search'">Search by Feel</button>
          </div>
          <div class="home-panel" id="home-action">
            <div id="selected">
              {{ selected.title }}
            </div>
            <button v-on:click="player('play', {title: selected.title})">Play Now</button>
            <button v-on:click="player('fadeIn', {title: selected.title, duration: 5})">Fade In</button>
            <button v-on:click="player('play', {title: selected.title, delay: 3})">Play in 3s</button>
          </div>
          <div class="home-panel" id="home-manage">
            <button v-on:click="player('stop', {})">Stop Now</button>
            <button v-on:click="player('fadeOut', {duration: 5})">Fade Out</button>
            <button v-on:click="player('stop', {delay: 3})">Stop in 3s</button>
          </div>
        </div>

        <div id="search" v-show="page == 'search'">
          <input id="search-bar" type="text" v-model="query" v-on:keyup="search">
          <button id="clear-search" v-on:click="query=``; clearFeels(); search(query);">Clear</button>
          <div id="results">
            <div v-on:click="selected = item; page = 'home'" class="result" v-for="item in items">
              {{item.title}}
            </div >
          </div>
          <div id="feels">
            <div v-on:click="feel.selected = !feel.selected; search();" class="feel" :class="{selected: feel.selected}" v-for="feel in feels">
              {{ feel.name }}
            </div>
          </div>
        </div>


      </div>
    </div>
  </div>
</template>

<script>
import Hello from './components/Hello'
import screenfull from 'screenfull'
import io from 'socket.io-client'
import Fuse from 'fuse.js'
import _ from 'lodash'

var data = {
  fullscreen: false,
  items: [],
  query: '',
  feels: [],
  page: 'home',
  selected: {title: 'none'}
}


var serverUrl = 'http://' + location.host.split(location.port)[0] + '8080'

var socket = io.connect(serverUrl);

var library;
var allSongs;

// So far, this just gets the incompetech songs
socket.emit('controller to server', {command: "get incompetech data"})
socket.on('server to controller', (jsonStuff) => {
  allSongs = jsonStuff;
  library = new Fuse(allSongs, {
    keys: ['title']
  });
  data.items = allSongs;

  let uniqueFeels = {}
  allSongs.forEach((song) => {
    song.feels.forEach((feel) => {
      if (feel.length) {
        uniqueFeels[feel] = true;        
      }
    })
  })
  data.feels = Object.keys(uniqueFeels).sort().map((o) => {
    return {name: o, selected: false};
  });
})


export default {
  name: 'app',
  data() {
    return data;
  },
  components: {
    Hello
  },
  methods: {
    goFullscreen() {
      screenfull.request();
      this.fullscreen = true;
    },
    search() {
      this.items = library.search(this.query);
      if (this.items.length == 0) {
        this.items = allSongs;
      }

      let selectedFeels = this.feels.filter((o) => {
        if (o.selected) {
          return true;
        }
        return false
      }).map((o) => {
        return o.name;
      })
      if (selectedFeels.length > 0) {
        this.items = this.items.filter((o) => {
          if (_.intersection(selectedFeels, o.feels).length == selectedFeels.length) {
            return true;
          }
          return false;
        })        
      }
    },
    focusSearchBar() {
      this.page = 'search';
      this.query = '';
      setTimeout(() => {
        document.getElementById('search-bar').focus();
      }, 200)
    },
    player(command, args) {
      socket.emit('controller to player', {command: command, args: args});
    },
    clearFeels() {
      this.feels.forEach((o) => {
        o.selected = false;
      })
    }
  }
}
</script>

<style lang="scss">

body, html {
  margin: 0;
}

input {
  margin: 10px;
  padding: 10px;
  font-size: 16px;
}

#results {
  position: absolute;
  top: 10%;
  right: 0;
  width: 50%;
  height: 90%;
  overflow-y: scroll;

  .result {
    border: 1px solid black;
    padding: 5px;
    margin: 5px;
    border-radius: 999px;
  }
}

#feels {
  display: flex;
  width: 50%;
  flex-wrap: wrap;
  .feel {
    // font-size: px;
    border: 1px solid black;
    padding: 5px;
    margin: 5px;
    border-radius: 999px;
    &.selected {
      background-color: black;
      color: white;
    }
  }
}

#home {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  height: 100vh;
  width: 100vw;
  .home-panel {
    width: 33.3333%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
  }
  #home-search {
    background-color: green;
  }
  #home-action {
    background-color: yellow;
  }
  #home-manage {
    background-color: red;
  }

  button {
    font-size: 18px;
    padding-top: 30px;
    padding-bottom: 30px;
    width: 90%;
    font-size: 24px;
    border: 1px solid white;
  }

  #selected {
    position: relative;
    border: 1px solid black;
    padding: 15px;
    width: 70%;
    &::before {
      content: "selected";
      position: absolute;
      top: -15px;
      right: 10px;
      background-color: yellow;
      padding: 5px;
      font-size: 12px;
    }
  }
}

</style>
