import fs from 'fs';

/* --- Symbols for Private Members --- */

// Private Values
const OPTIONS = Symbol('Options');
const FILE_NAME = Symbol('Filename');

// Private Methods
const WRITE_TO_FILE = Symbol('Append an html string to the report file');
const WRITE_JSON = Symbol('Process data and write to JSON output');

/* --- Class Declaration and Public Method Implementations --- */
/**
 * Manages writing data from SQLite to JSON file
 *
 * @export
 * @class JSONReporter
 */
export default class JSONReporter {
  constructor(opts) {
    // Values
    this[OPTIONS] = opts;

    // Methods
    this[WRITE_JSON] = writeJSON.bind(this);
  }

  /**
   * Open JSON file to write report to
   *
   * @param {string} [filename='report.json']
   * @memberof JSONReporter
   */
  open() {
    const { output } = this[OPTIONS];
    fs.writeFileSync(`${output}.json`, '');
    this[FILE_NAME] = fs.openSync(`${output}.json`, 'w');
    this[WRITE_TO_FILE] = string => fs.writeSync(this[FILE_NAME], string);
  }

  /**
   * Write data from SQLite DB to JSON output
   *
   * @param {any[]} testedURLs
   * @memberof JSONReporter
   */
  async write(testedURLs) {
    await this[WRITE_JSON](testedURLs);
  }

  /**
   * Close JSON file
   *
   * @memberof JSONReporter
   */
  close() {
    fs.closeSync(this[FILE_NAME]);
  }
}

/* --- Private Method Implementations --- */
/**
 * Pull data from SQLite DB and write to JSON in chunks.
 *
 * @param {Object[]}    testedURLs
 * @param {string}      testedURLs[].url
 *
 * @private
 * @memberof JSONReporter
 */
async function writeJSON(testedURLs) {
  const writeToFile = this[WRITE_TO_FILE];
  const { logger } = this[OPTIONS];

  await writeToFile(`{"date": "${new Date().toString()}","title":"aXe Accessibility Engine Report for ${
    this[OPTIONS].domain
  }","reports": {`);

  await Promise.all(testedURLs.map(async ({ url }, i, arr) => {
    const violations = await this[OPTIONS].db.read('violations_summary', { url });

    const passes = await this[OPTIONS].db.read('passes_summary', { url });

    const results = {
      violations: violations.reduce(reduceTestResults, {}),
      passes: passes.reduce(reduceTestResults, {}),
    };

    writeToFile(`"${url}": ${JSON.stringify(results)}`);

    if (i !== arr.length - 1) {
      writeToFile(',');
    }
  }));
  logger.debug('Ending JSON output');
  writeToFile('}}');
}

/**
 * Reducer fn to turn array of results into object using viewPorts as keys
 *
 * @param {Object[]} results
 * @param {Object} nextResult
 * @param {String} nextResult.viewPort
 * @param {String} nextResult.report
 * @returns {Object}
 */
function reduceTestResults(results, nextResult) {
  results[nextResult.viewPort] = JSON.parse(nextResult.report);
  return results;
}
