var fs = require('fs');
var waveform = require('waveform-node');
var jsonfile = require('jsonfile');
var _ = require('lodash')

var songsFilename = '../static/incompetech_songs.json'
var waveformsFilename = '../static/incompetech_waveforms.json'
var songFilesBase = '../static/incompetech_songs/'

// load json of scraped incompetech data

var data = {};

function getSongs() {
	fs.readFile(songsFilename, (err, jsonStuff) => {
		data.songs = JSON.parse(jsonStuff.toString())
		getExistingWaveforms()
	})
}

function getExistingWaveforms() {
	fs.readFile(waveformsFilename, (err, jsonStuff) => {
		data.waveforms = _.reverse(JSON.parse(jsonStuff.toString()))
		generateNewWaveforms()
	})	
}

function generateNewWaveforms() {
	// convert json into list of song objects
	var computedWaveforms = data.waveforms

	options = {
		numOfSample: 500
	}

	computeWaveform = (songs, n) => {
		if (n == songs.length) {
			return;
		}

		let song = songs[n]

		// Skip songs longer than 20 minutes
		var length = parseInt(song.length.split(':')[0]) * 60 + parseInt(song.length.split(':')[1])
		if (length > 9 * 60) {
			computedWaveforms[song.title] = [0]
			jsonfile.writeFileSync(waveformsFilename, computedWaveforms);
			computeWaveform(songs, n + 1);
			console.log(song.title, (n+1) + '/' + songs.length, `(Skipped, too long)`);
			return;			
		}

		// Skip songs that have already been computed
		if (computedWaveforms[song.title] && computedWaveforms[song.title].length > 5) {
			computeWaveform(songs, n + 1);
			console.log(song.title, (n+1) + '/' + songs.length, `(Already computed)`);
			return;
		}

		console.log(song.title, (n+1) + '/' + songs.length);


		waveform.getWaveForm(songFilesBase + song.filename, options, (error, peaks) => {
			if (error) {
				console.log(error);
			}
			computedWaveforms[song.title] = peaks
			jsonfile.writeFileSync(waveformsFilename, computedWaveforms);
			computeWaveform(songs, n + 1);
		})
	}

	computeWaveform(data.songs, 0);
}

getSongs();