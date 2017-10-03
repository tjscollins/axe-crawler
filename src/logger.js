/**
 * @fileOverview Log based on configured verbosity
 * @name logger.js
 * @author Tyler Collins
 * @license MIT
 */

/**
 * debug -- pass to console.log if process.verbose
 *
 * @param {any[]} args
 */
function debug(...args) {
  if (process.verbose === 'debug' && !process.quiet) {
    console.log(...args);
  }
}

/**
 * info -- pass to console.log if process.verbose
 *
 * @param {any[]} args
 */
function info(...args) {
  if (!process.quiet && (process.verbose === 'info' || process.verbose === 'debug')) {
    console.log(...args);
  }
}

/**
 * error -- pass to console.error if process.verbose
 *
 * @param {any[]} args
 */
function error(...args) {
  console.log('Error logger called', process.verbose);
  if (process.verbose !== undefined && !process.quiet) {
    console.error(...args);
  }
}

export default {
  info,
  error,
};
