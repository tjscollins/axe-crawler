import fs from 'fs';
import minimist from 'minimist';

import Logger from './logger';

/* --- Constants --- */
const DEFAULT_CONFIG_FILE = './.axe-crawler.json';

const DEFAULT_OPTS = {
  depth: 5,
  check: undefined, // undefined => check all
  output: 'reports',
  ignore: '.*',
  whitelist: '.*',
  random: false,
  viewPorts: [
    {
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
};

/* --- Symbols for Private Values and Methods --- */

// Values
const ARGS = Symbol('Command line arguments');
const JSON_OPTS = Symbol('JSON specified configuration');
const DEFAULT_CONFIG = Symbol('Default configuration');

/* --- Class Declaration and Public Method Implementations --- */
export default class AxeCrawlerConfiguration {
  constructor() {
    // Values
    this[DEFAULT_CONFIG] = DEFAULT_OPTS;
    this[ARGS] = processArgs.call(this);
    this[JSON_OPTS] = processJSON.call(this);

    // Options become immutable public values
    Object.assign(this, this[DEFAULT_CONFIG], this[JSON_OPTS], this[ARGS]);

    // Sanity check for some values
    checkValues.call(this);

    this.logger.debug('Crawling with options: \n', this);
  }
}

/* --- Private Method Implementations --- */
function checkValues() {
  const { logger, random } = this;
  if (!(random > 0 && random < 1)) {
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

  let { verbose } = argv;
  if (argv.dryRun) {
    // if dryRun, default to verbose = debug
    verbose = argv.verbose || 'debug';
    argv.check = 0;
  }
  if (argv.quiet) {
    // --quiet overrides all other verbose settings
    verbose = 'quiet';
  }

  const logger = new Logger(verbose);

  if (argv.dryRun) {
    logger.force(`Performing dry run with ${argv.verbose} level logging`);
  }

  return Object.assign(argv, { logger, verbose });
}

function processJSON() {
  const { logger, configFile } = this[ARGS];
  const optsFile = configFile || DEFAULT_CONFIG_FILE;
  let jsonOpts = {};
  try {
    jsonOpts = JSON.parse(fs.readFileSync(optsFile));
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
  return views.split(',')
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
        throw new Error('Invalid viewports: ', views);
      }
    }).filter(view => view);
}
