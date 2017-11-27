import fs from 'fs';

/* --- Symbols for Private Members --- */

// Private Values
const OPTIONS = Symbol('Options');
const FILE_NAME = Symbol('Filename');

// Private Methods
const WRITE_TO_FILE = Symbol('Append an html string to the report file');
const WRITE_JSON = Symbol('Process data and write to JSON output');

/* --- Class Declaration and Public Method Implementations --- */
export default class JSONReporter {
  constructor(opts) {
    // Values
    this[OPTIONS] = opts;

    // Methods
    this[WRITE_JSON] = writeJSON.bind(this);
  }

  open(filename = 'report.json') {
    fs.writeFileSync(filename, '');
    this[FILE_NAME] = fs.openSync(filename, 'w');
    this[WRITE_TO_FILE] = string => fs.writeSync(this[FILE_NAME], string);
  }

  async write(testedURLs) {
    await this[WRITE_JSON](testedURLs);
  }

  close() {
    fs.closeSync(this[FILE_NAME]);
  }
}

/* --- Private Method Implementations --- */
async function writeJSON(testedURLs) {
  const writeToFile = this[WRITE_TO_FILE];
  const { logger } = this[OPTIONS];

  await writeToFile(`{"date": "${new Date().toString()}","title":"aXe Accessibility Engine Report for ${this[OPTIONS].domain}","reports": {`);
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
  await writeToFile('}}');
}

function reduceTestResults(results, nextResult) {
  results[nextResult.viewPort] = JSON.parse(nextResult.report);
  return results;
}
