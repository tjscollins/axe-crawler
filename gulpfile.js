const gulp = require('gulp');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const livereload = require('gulp-livereload');
const sass = require('gulp-sass');
const cleanCss = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');

const HTML_REPORTER_SRC_DIR = 'src/reporters/HtmlReporter/';

gulp.task('DEV_SCSS', () => gulp
  .src(`${HTML_REPORTER_SRC_DIR}scss/index.scss`)
  .pipe(sourcemaps.init())
  .pipe(sass())
  .pipe(sourcemaps.write())
  .pipe(gulp.dest('dist/'))
  .pipe(livereload()));

gulp.task('PROD_SCSS', () => gulp
  .src(`${HTML_REPORTER_SRC_DIR}scss/index.scss`)
  .pipe(sass())
  .pipe(autoprefixer())
  .pipe(cleanCss())
  .pipe(gulp.dest('dist/')));

gulp.task('default', ['DEC_SCSS']);
gulp.task('watch', ['DEV_SCSS'], () => {
  livereload.listen();
  gulp.watch(`${HTML_REPORTER_SRC_DIR}**/*.scss`, ['DEV_SCSS']);
});

