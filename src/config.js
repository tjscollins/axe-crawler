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

export default function crawlerOpts(file) {
  const argv = minimist(process.argv.slice(2));
  const optsFile = file || DEFAULT_FILE;
  try {
    return Object.assign(DEFAULT_OPTS, JSON.parse(fs.readFileSync(optsFile)), argv);
  } catch (err) {
    if (err.code === 'ENOENT' && err.path === optsFile) {
      return DEFAULT_OPTS;
    }
    throw err;
  }
}
