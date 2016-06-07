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
    uglify = require('gulp-uglify');

var config = {
     bowerDir: './vendor/'
}

gulp.task("scripts", function() {
    var filterJS = gulpFilter('**/*.js');
    gulp.src(bower_files( { paths: {
        bowerDirectory: config.bowerDir,
        bowerrc: './.bowerrc',
        bowerJson: './bower.json'
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
      .pipe(concat('./vendor.js'))
      .pipe(gulp.dest('./'))
      .pipe(rename('vendor.min.js'))
      .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./'));
});

gulp.task("hivtrace-scripts", function() {
  gulp.src(['./vendor/hivtrace/hivtrace/web/static/**/*']).pipe(gulp.dest('./hivtrace/'));
  gulp.src(['./vendor/hivtrace/hivtrace/web/static/workers/*']).pipe(gulp.dest('./workers/'));
});

gulp.task("worker-scripts", function() {
  gulp.src([ './vendor/underscore/underscore.js', './vendor/d3/d3.js'])
    .pipe(concat('./worker-vendor.js'))
    .pipe(gulp.dest('./public/assets/js/'));
});

gulp.task("css", function() {
    var filterJS = gulpFilter('**/*.css');
    gulp.src(bower_files( { paths: {
        bowerDirectory: config.bowerDir,
        bowerrc: './.bowerrc',
        bowerJson: './bower.json'
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
      .pipe(concat('./vendor.css'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./'));
});

gulp.task('fonts', function() {
    return gulp.src([path.join(config.bowerDir, '/font-awesome/fonts/fontawesome-webfont.*')])
            .pipe(gulp.dest('./fonts/'));
});

gulp.task('bs-fonts', function() {
    return gulp.src([path.join(config.bowerDir, '/bootstrap/fonts/*')])
            .pipe(gulp.dest('./fonts/'));
});

gulp.task('build', ['scripts', 'hivtrace-scripts', 'worker-scripts', 'css', 'fonts', 'bs-fonts']);

gulp.task('watch', function () {
    watch('src/**/*', function () {
        gulp.start('build');
    });
});

gulp.task('default', ['build'], function() {
  process.exit(0);
});

