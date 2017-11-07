/**
 * Builds a logger with a supplied log level
 *
 * @class Logger
 */
class Logger {
  /**
   * Creates an instance of Logger.
   * @param {string} level level of logging output desired
   * @memberof Logger
   */
  constructor(level) {
    switch (level) {
      case 'info':
        this.verbose = 'info';
        break;
      case 'debug':
        this.verbose = 'debug';
        break;
      case 'quiet':
        this.quiet = true;
        break;
      default:
        this.verbose = 'error';
        break;
    }
  }

  /**
   * Pass arguments to console.log if this.verbose == debug
   *
   * @param {any[]} args
   */
  debug(...args) {
    if (this.verbose === 'debug' && !this.quiet) {
      console.log('DEBUG:', ...args);
    }
  }

  /**
   * Pass arguments to console.log if this.verbose >= info
   *
   * @param {any[]} args
   */
  info(...args) {
    if (!this.quiet && (this.verbose === 'info' || this.verbose === 'debug')) {
      console.log('INFO:', ...args);
    }
  }

  /**
   * Pass arguments to console.error if this.verbose >= error
   *
   * @param {any[]} args
   */
  error(...args) {
    if (this.verbose !== undefined && !this.quiet) {
      console.error('ERROR:', ...args);
    }
  }

  /**
   * Forced logging regardless of verbose settings
   *
   * @param {any[]} args
   */
  force(...args) {
    console.log(...args);
  }
}

export default Logger;
