/**
 * @fileOverview Log based on configured verbosity
 * @name logger.js
 * @author Tyler Collins
 * @license MIT
 */


/**
 * info -- pass to console.log if process.verbose
 *
 * @param {any[]} args
 */
function info(...args) {
  if (process.verbose) {
    console.log(...args);
  }
}

/**
 * error -- pass to console.error if process.verbose
 *
 * @param {any[]} args
 */
function error(...args) {
  if (process.verbose) {
    console.error(...args);
  }
}
