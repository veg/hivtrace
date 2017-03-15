var gulp = require('gulp'),
    watchify = require('watchify'),
    concat = require('gulp-concat'),
    bower = require('gulp-bower'),
    gulpFilter = require('gulp-filter');
    bower_files = require('main-bower-files'),
    path = require('path'),
    less = require('gulp-less'),
    watch = require('gulp-watch'),
    debug = require('gulp-debug'),
    rename = require('gulp-rename'),
    sourcemaps = require('gulp-sourcemaps'),
    order = require('gulp-order'),
    uglify = require('gulp-uglify');

var config = {
     bowerDir: './static/vendor/'
}

gulp.task("scripts", function() {
    var filterJS = gulpFilter('**/*.js');
    gulp.src(bower_files( { paths: {
        bowerDirectory: config.bowerDir,
        bowerrc: './../../.bowerrc',
        bowerJson: './../../bower.json'
     }, 
    "overrides": {
        "crossfilter": {
          "main": [
            "crossfilter.js",
          ]
        },
    }}), { base: config.bowerDir })
    .pipe(filterJS)
    .pipe(sourcemaps.init())
      .pipe(concat('./static/vendor.js'))
      .pipe(gulp.dest('./'))
      .pipe(rename('vendor.min.js'))
      .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./static/'));
});

gulp.task("worker-scripts", function() {
    gulp.src([ './static/vendor/underscore/underscore.js', './static/vendor/d3/d3.js', './src/misc.js'])
        .pipe(concat('./worker-vendor.js'))
            .pipe(gulp.dest('./static/workers/'));
});

gulp.task("hivtrace-scripts", function() {

  return gulp.src(['./static/src/*.js'])
    .pipe(order([
      "main.js",
      "misc.js",
      "histogram.js",
      "clusternetwork.js",
    ])).pipe(sourcemaps.init())
          .pipe(concat('hivtrace.js'))
          .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./static/'));

});

gulp.task("css", function() {
    var filterJS = gulpFilter('**/*.css');
    gulp.src(bower_files( { paths: {
        bowerDirectory: config.bowerDir,
        bowerrc: './../../.bowerrc',
        bowerJson: './../../bower.json'
     },
    "overrides": {
      "font-awesome": {
        "main": [
          "css/font-awesome.css",
        ]
      },
      "tether": {
        "main": [
          "dist/css/tether.css",
        ]
      },
      "tether-shepherd": {
        "main": [
          "dist/css/shepherd-theme-default.css", "dist/css/shepherd-theme-arrows.css"
        ]
      }    
    }}), { base: config.bowerDir })
    .pipe(filterJS)
    .pipe(sourcemaps.init())
      .pipe(concat('./static/vendor.css'))
    .pipe(sourcemaps.write('./static/'))
    .pipe(gulp.dest('./static/'));
});

gulp.task('fonts', function() {
    return gulp.src([path.join(config.bowerDir, '/font-awesome/fonts/fontawesome-webfont.*')])
            .pipe(gulp.dest('./static/fonts/'));
});

gulp.task('bs-fonts', function() {
    return gulp.src([path.join(config.bowerDir, '/bootstrap/fonts/*')])
            .pipe(gulp.dest('./static/fonts/'));
});

//gulp.task('build', ['scripts', 'worker-scripts', 'hivtrace-scripts', 'css', 'fonts', 'bs-fonts']);
gulp.task('build', ['hivtrace-scripts']);

gulp.task('watch', function () {
    watch('static/**/*', function () {
        gulp.start('build');
    });
});

gulp.task('default', ['build'], function() {
  process.exit(0);
});

