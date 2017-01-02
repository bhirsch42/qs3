<template>
  <div id="app">
    <div id="fullscreen-button-wrapper" v-if="!fullscreen">
      <button id="fullscreen-button" v-on:click="goFullscreen">Click me</button>   
    </div>
    <div v-if="fullscreen">
      <div class="fullscreen">

        <div id="home" v-show="page == 'home'">
          <div class="home-panel" id="home-search">
            <div class="button" v-on:click="clearFeels(); clearGenres(); focusSearchBar();">Search by Name</div>
            <div class="button" v-on:click="page = 'search'">Search by Feel / Genre</div>
          </div>
          <div class="home-panel" id="home-action">
            <div id="selected">
              {{ selected.title }}
            </div>
            <div class="button" v-on:click="player('play', {title: selected.title})">Play Now</div>
            <div class="button" v-on:click="player('fadeIn', {title: selected.title, duration: 5})">Fade In</div>
            <div class="button" v-on:click="player('play', {title: selected.title, countIn: true})">Count In</div>
          </div>
          <div class="home-panel" id="home-manage">
            <div class="button" v-on:click="player('stop', {})">Stop Now</div>
            <div class="button" v-on:click="player('fadeOut', {duration: 5})">Fade Out</div>
            <div class="button" v-on:click="player('stop', {countIn: true})">Count Out</div>
          </div>
        </div>

        <div id="search" v-show="page == 'search'">
          <div id="search-bar-wrapper">
            <input id="search-bar" type="text" v-model="query" v-on:keyup="search">
            <button id="clear-search" v-on:click="query=``; clearFeels(); clearGenres(); search(query);">Clear</button>            
          </div>
          <div class="thirds">
            <div id="feels">
              <div v-on:click="feel.selected = !feel.selected; search();" class="feel" :class="{selected: feel.selected}" v-for="feel in feels">
                {{ feel.name }}
              </div>
            </div>
            <div id="genres">
              <div v-on:click="genre.selected = !genre.selected; search();" class="genre" :class="{selected: genre.selected}" v-for="genre in genres">
                {{ genre.name }}
              </div>
            </div>            
            <div id="results">
              <div v-on:click="selected = item; page = 'home'" class="result" v-for="item in items">
                {{item.title}}
              </div >
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
  genres: [],
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
  // save all songs in global var
  allSongs = jsonStuff;

  // create searchable library
  library = new Fuse(allSongs, {
    keys: ['title']
  });
  data.items = allSongs;

  // create a hash of unique feels
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

  // create a hash of unique genres
  let uniqueGenres = {}
  allSongs.forEach((song) => {
    uniqueGenres[song.genre] = true;        
  })
  data.genres = Object.keys(uniqueGenres).sort().map((o) => {
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
      console.log('Going Fullscreen')
      this.fullscreen = true;
      screenfull.request();
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
      let selectedGenres = this.genres.filter((o) => {
        if (o.selected) {
          return true;
        }
        return false
      }).map((o) => {
        return o.name;
      })
      console.log(selectedGenres)
      if (selectedGenres.length > 0) {
        this.items = this.items.filter((o) => {
          return selectedGenres.indexOf(o.genre) > -1;
        })        
      }
      document.getElementById('results').scrollTop = 0;
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
    },
    clearGenres() {
      this.genres.forEach((o) => {
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
  // padding: 10px;
  font-size: 16px;
}

#fullscreen-button-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
}

#fullscreen-button {
  font-size: 20vh;
  padding: 10vh;
}

#results {
  height: 85vh;
  overflow-y: scroll;
  .result {
    border: 1px solid black;
    padding: 5px;
    margin: 5px;
    border-radius: 999px;
  }
}

#feels, #genres, #results {
  width: 33%;
}

#feels, #genres {
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: stretch;
  .feel, .genre {
    display: inline-block;
    width: 23%;
    padding-top: 10px;
    padding-bottom: 10px;
    overflow: hidden;
    white-space: nowrap;
    text-align: center;
    border-radius: 10px;
    font-size: 12px;
  }  
}

.feel {
  border: 1px solid green;
  &.selected {
    background-color: green;
    color: white;
  }
}

.genre {
  border: 1px solid red;
  &.selected {
    background-color: red;
    color: white;
  }
}

#search-bar-wrapper {
  height: 15vh;
}

.thirds {
  display: flex;
  height: 85vh;
  overflow: hidden;
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

  .button {
    user-select: none;
    text-align: center;
    font-size: 18px;
    width: 90%;
    font-size: 24px;
    border: 1px solid white;
    background-color: rgba(255,255,255,.8);
    
    padding-top: 20px;
    padding-bottom: 20px;
    &:active {
      background-color: rgba(0,0,0,.8);
      color: white;
    }
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
