/**
 * Pass arguments to console.log if process.verbose == debug
 *
 * @param {any[]} args
 */
function debug(...args) {
  if (process.verbose === 'debug' && !process.quiet) {
    console.log('DEBUG:', ...args);
  }
}

/**
 * Pass arguments to console.log if process.verbose >= info
 *
 * @param {any[]} args
 */
function info(...args) {
  if (!process.quiet && (process.verbose === 'info' || process.verbose === 'debug')) {
    console.log('INFO:', ...args);
  }
}

/**
 * Pass arguments to console.error if process.verbose >= error
 *
 * @param {any[]} args
 */
function error(...args) {
  if (process.verbose !== undefined && !process.quiet) {
    console.error('ERROR:', ...args);
  }
}

/**
 * Forced logging regardles of verbose settings
 *
 * @param {any} args
 */
function force(...args) {
  console.log(...args);
}

/**
 * Configure logger to supplied logging level.  Default to 'error'
 *
 * @param {string} level
 */
function configure(level) {
  switch (level) {
    case 'info':
      process.verbose = 'info';
      break;
    case 'debug':
      process.verbose = 'debug';
      break;
    case 'quiet':
      process.quiet = true;
      break;
    default:
      process.verbose = 'error';
      break;
  }
}

export default {
  info,
  error,
  debug,
  force,
  configure,
};
