var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var https = require('https');
var jsonfile = require('jsonfile')

var songFilePath = '../static/incompetech_songs/';
var infoJSONPath = '../static/incompetech_songs.json'
var url = 'https://incompetech.com/music/royalty-free/full_list.php';

var downloadedSongNames = {};
var songData = [];

function withWebData(url, fn) {
	request(url, function(error, response, html){
	  if(!error) {
	    fn(cheerio.load(html));
	  }
	})	
}

function scrapeAllTracksList($) {
  var relUrls = [];
  $($('#wrapper').find('p')[0]).find('a').each((i,o) => {
  	relUrls.push(o.attribs.href)
  });
  for (let i = 0; i < relUrls.length; i++) {
	  setTimeout(() => {
		  withWebData(`https://incompetech.com${relUrls[i]}`, scrapeSongPage);  	
	  }, i*1000)
  }
}

function scrapeSongPage($) {
	let infoEls = $($($('.expansion-container').find('div')[0]).find('div')[1]).find('p');
	let title = $(infoEls[0]).text().split(`"`)[1];
	let instruments = $(infoEls[1]).text().split('ments: ')[1].split(', ').map((s) => {return s.toLowerCase()});
	let feels = $(infoEls[2]).text().split('eel: ')[1].split(', ').map((s) => {return s.toLowerCase()});
	let description = $(infoEls[3]).text();

	let infoTable = $('.filtered-song-list').find('td');
	let tempo = parseInt($(infoTable[1]).text().split(' bpm'));
	let genre = $(infoTable[2]).text().toLowerCase();
	let length = $(infoTable[3]).text();

	let downloadUrl = `https://incompetech.com${$('a.btn-primary')[0].attribs.href}`;
	let filename = decodeURI(downloadUrl.split('/mp3-royaltyfree/')[1]);

	download(downloadUrl, filename);

	songData.push({
		title: title,
		instruments: instruments,
		feels: feels,
		description: description,
		tempo: tempo,
		genre: genre,
		length: length,
		downloadUrl: downloadUrl,
		filename: filename,
	});

	jsonfile.writeFileSync(infoJSONPath, songData);

}

function download(url, filename) {
	if (downloadedSongNames[filename]) {
		console.log(`Already have ${filename}`);
		return;
	}
	var file = fs.createWriteStream(songFilePath + filename);
	var request = https.get(url, function(response) {
	  response.pipe(file);
	});
	console.log(`Downloading ${filename}`);
}

function cacheDowloadedSongNames() {
	fs.readdir(songFilePath, (err, files) => {
	  files.forEach(file => {
	    downloadedSongNames[file] = true;
	  });
	})
}

cacheDowloadedSongNames();
withWebData(url, scrapeAllTracksList);