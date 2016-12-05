var gulp = require('gulp');
var concat = require('gulp-concat');
var order = require('gulp-order');

gulp.task('scripts', function() {
    return gulp.src(['src/**/*.js'])
    .pipe(order([
      "datamonkey/datamonkey.js",
      "datamonkey/*.js",
      "busted/busted.js",
      "**/*.js"
    ]))
    .pipe(concat('hyphy-vision.js'))
    .pipe(gulp.dest('./'));
});
