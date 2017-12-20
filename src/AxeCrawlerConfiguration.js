import fs from 'fs';
import minimist from 'minimist';
import Logger from 'utility-logger';

import DB from './db/index';
import {
  isNatural,
} from './util';

/* --- Constants --- */
const DEFAULT_CONFIG_FILE = './.axe-crawler.json';
const VERSION = require('../package.json').version;

const DEFAULT_OPTS = {
  depth: 5,
  check: undefined, // undefined => check all
  output: 'reports',
  ignore: '^$',
  whitelist: '.*',
  random: 1,
  viewPorts: [{
    name: 'mobile',
    width: 360,
    height: 640,
  },
  {
    name: 'tablet_vertical',
    width: 768,
    height: 1024,
  },
  {
    name: 'tablet_horizontal',
    width: 1024,
    height: 768,
  },
  {
    name: 'desktop',
    width: 1440,
    height: 900,
  },
  ],
  verbose: 'error',
  useFileOver: 50, // Use file-system DB if total page views exceed this value
};

/* --- Symbols for Private Values and Methods --- */

// Values
const ARGS = Symbol('Command line arguments');
const JSON_OPTS = Symbol('JSON specified configuration');
const DEFAULT_CONFIG = Symbol('Default configuration');

/**
 * Manages confgiuration of axe-crawler by combining default, JSON,
 * and command line options into one object and setting up the database
 * connection based on those options.
 *
 * @export
 * @class AxeCrawlerConfiguration
 */
export default class AxeCrawlerConfiguration {
  /**
   * Creates an instance of AxeCrawlerConfiguration.
   *
   * @memberof AxeCrawlerConfiguration
   */
  constructor(opts = {}) {
    // Values
    this[DEFAULT_CONFIG] = DEFAULT_OPTS;
    this[ARGS] = processArgs.call(this);
    this[JSON_OPTS] = processJSON.call(this);

    // Options become immutable public values
    Object.assign(this, this[DEFAULT_CONFIG], this[JSON_OPTS], this[ARGS], opts);

    // Sanity check for some values
    checkValues.call(this);

    this.logger.debug('Crawling with the following options: ', JSON.stringify(this, null, 4));
  }

  reportVersion() {
    if (this.version) console.log(`axe-crawler v${VERSION}`);
  }

  /**
   * Set numToCheck property by compary queue size with check option,
   * choosing the smaller of the two.
   *
   * @param {Set<string>} queue
   *
   * @public
   * @memberof AxeCrawlerConfiguration
   */
  setNumberToCheck(queue) {
    const {
      check,
    } = this;
    this.numToCheck = Math.min(isNatural(check) ? check : Infinity, queue.size);
  }

  /**
   * Setup and connect to SQLite DB, choosing between in-memory and file
   * based DB based on expected memory needs.
   *
   * @public
   * @memberof AxeCrawlerConfiguration
   */
  async configureDB() {
    const {
      random,
      viewPorts,
      numToCheck,
      useFileOver,
      logger,
    } = this;
    const viewsToTest = random * numToCheck * viewPorts.length;
    if (viewsToTest > useFileOver) {
      logger.info(`Over ${useFileOver} page views to test, switching to SQLite file mode to store results`);
      this.db = new DB({
        type: 'file',
      });
    } else {
      logger.debug(`Fewer than ${useFileOver} page views, using in-memory SQLite to store results`);
      this.db = new DB({
        type: 'memory',
      });
    }
    await this.db.initialize();
  }
}

/* --- Private Method Implementations --- */
function checkValues() {
  const {
    logger,
    random,
  } = this;
  if (!(random > 0 && random <= 1)) {
    logger.error(`Invalid random sampling rate specified: ${random}.  Defaulting to 100%`);
    this.random = 1;
  }
}

function processArgs() {
  const argv = minimist(process.argv.slice(2));
  argv.domain = argv._.last();
  delete argv._;

  if (argv.viewPorts) {
    argv.viewPorts = parseViewPortsArg(argv.viewPorts);
    if (argv.viewPorts.length === 0) {
      delete argv.viewPorts;
    }
  }

  let {
    verbose,
  } = argv;
  if (argv.dryRun) {
    // if dryRun, default to verbose = debug
    verbose = argv.verbose || 'debug';
    argv.check = 0;

    if (!argv.quiet) logger.log(`Performing dry run with ${verbose.toUpperCase()} level logging`);
  }
  if (argv.quiet) {
    // --quiet overrides all other verbose settings
    verbose = 'quiet';
  }

  const logger = new Logger({
    level: verbose || 'error',
  });

  return Object.assign({}, argv, {
    logger,
    verbose,
  });
}

function processJSON() {
  const {
    logger,
    configFile,
  } = this[ARGS];
  const optsFile = configFile || DEFAULT_CONFIG_FILE;
  let jsonOpts = {};
  try {
    jsonOpts = JSON.parse(fs.readFileSync(optsFile).toString());
  } catch (err) {
    if (err.code === 'ENOENT' && err.path === optsFile) {
      logger.error('No config file found');
    } else if (err instanceof SyntaxError) {
      logger.error(`Invalid JSON config file ${optsFile}\n\nIgnoring JSON config file...`);
    }
  }
  return jsonOpts;
}

/**
 * parseViewPortsArg - uses a regex to parse a cmd line argument giving custom
 * viewPorts to be tested
 *
 * @param {string} views value from cmd line option --viewPorts mobile:360x640,
 * tablet:768x1024 for example.
 * @returns {Object[]} array of viewPort objects to be added to globalOptions
 */
function parseViewPortsArg(views) {
  return views
    .split(',')
    .map((view) => {
      const parser = /(\w+):(\d+)x(\d+)/;
      try {
        const [, name, width, height] = parser.exec(view);
        return {
          name,
          width,
          height,
        };
      } catch (err) {
        throw new Error(`Invalid viewports: ${views}`);
      }
    })
    .filter(view => view);
}
