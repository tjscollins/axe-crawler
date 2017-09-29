/**
 * @fileOverview Read config options
 * @name config.js
 * @author Tyler Collins
 * @license MIT
 */

const fs = require('fs');
const minimist = require('minimist');

const DEFAULT_FILE = '.axecrawlerrc';

const DEFAULT_OPTS = {
  depth: 5,
  check: undefined, // undefined => check all
  output: 'reports',
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
};

/**
 * parseViewPortsArg - uses a regex to parse a cmd line argument giving custom
 * viewPorts to be tested
 *
 * @param {string} views value from cmd line option --viewPorts mobile:360x640,
 * tablet:768x1024 for example.
 */
function parseViewPortsArg(views) {
  return views.split(',')
    .map((view) => {
      const parser = /(\w+):(\d+)x(\d+)/;
      try {
        const [, name, width, height] = parser.exec(view);
        return { name, width, height };
      } catch (err) {
        throw new Error('Invalid viewports: ', views);
      }
    }).filter(view => view);
}

export default function crawlerOpts(file) {
  const argv = minimist(process.argv.slice(2));
  argv.domains = argv._;
  if (argv.viewPorts) {
    argv.viewPorts = parseViewPortsArg(argv.viewPorts);
    if (argv.viewPorts.length === 0) {
      delete argv.viewPorts;
    }
  }

  const optsFile = file || DEFAULT_FILE;
  try {
    return Object.assign(DEFAULT_OPTS, JSON.parse(fs.readFileSync(optsFile)), argv);
  } catch (err) {
    if (err.code === 'ENOENT' && err.path === optsFile) {
      return Object.assign(DEFAULT_OPTS, argv);
    }
    throw err;
  }
}
