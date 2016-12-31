var gulp = require('gulp');
var shell = require('gulp-shell');
var nodemon = require('gulp-nodemon');

gulp.task('default', ['start-controller', 'start-player', 'start-server'])

gulp.task('start-controller', shell.task(['yarn run dev'], {'cwd': './client-controller'}))
gulp.task('start-player', shell.task(['yarn run dev'], {'cwd': './client-player'}))
gulp.task('start-server', () => {
	nodemon({
		script: './server/server.js',
		ext: 'js html',
		env: {'NODE_ENV': 'development'}
	})
})
