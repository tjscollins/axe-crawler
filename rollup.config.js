// rollup.config.js
import babel from 'rollup-plugin-babel';

export default {
  // core input options
  input: 'src/index.js', // required
  // external,
  plugins: [babel()],

  // advanced input options
  // onwarn,

  // danger zone
  // acorn,
  // context,
  // moduleContext,
  // legacy

  output: { // required (can be an array, for multiple outputs)
    // core output options
    file: 'bin/axe-crawler', // required
    format: 'umd', // required
    name: 'axeCrawler',
    // globals,

    // advanced output options
    // paths,
    banner: '#!/usr/bin/env node',
    // footer,
    // intro,
    // outro,
    // sourcemap,
    // sourcemapFile,
    // interop,

    // danger zone
    // exports,
    // amd,
    // indent
    // strict
  },
};
