import fs from 'fs';
import marked from 'marked';
import escape from 'escape-html';

/* --- Symbols for Private Members --- */

// Private Values
const OPTIONS = Symbol('Options');
const FILE_NAME = Symbol('Filename');
const TOTALS = Symbol('Total count of passing and failing tests');
const STYLE_SHEETS =
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/2.8.0/github-markdown.css"><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.3/css/bootstrap.min.css" integrity="sha384-Zug+QiDoJOrZ5t4lssLdxGhVrurbmBWopoEl+M6BdEfwnCJZtKxi1KgxUyJq13dy" crossorigin="anonymous">';
const CSS = fs.readFileSync(`${__dirname}/index.css`);

// Private Methods
const INIT_HTML = Symbol('Prepare HTML File');
const WRITE_TO_FILE = Symbol('Append an html string to the report file');
const WRITE_SUMMARY_TABLE = Symbol('Write html summary table');
const WRITE_COMPLETE_RESULTS = Symbol('Write complete test results to html');
const CLOSE_HTML = Symbol('Append closing tags and close html file');

/* --- Class Declaration and Public Method Implementations --- */

/**
 * Manages writing data from SQLite to HTML Report
 *
 * @export
 * @class HTMLReporter
 */
export default class HTMLReporter {
  constructor(opts) {
    // Values
    this[OPTIONS] = opts;
    this[TOTALS] = { passes: 0, violations: 0 };

    // Methods
    this[INIT_HTML] = initHTML.bind(this);
    this[WRITE_SUMMARY_TABLE] = writeSummaryTable.bind(this);
    this[WRITE_COMPLETE_RESULTS] = writeCompleteResults.bind(this);
    this[CLOSE_HTML] = closeHTML.bind(this);
  }

  /**
   * Open HTML file to write the report to
   *
   * @public
   * @memberof HTMLReporter
   */
  async open() {
    const { output } = this[OPTIONS];
    fs.writeFileSync(`${output}.html`, '');
    this[FILE_NAME] = fs.openSync(`${output}.html`, 'w');
    this[WRITE_TO_FILE] = string => fs.writeSync(this[FILE_NAME], string);
  }

  /**
   * Pull data from SQLite and create HTML report, writing to file in chunks.
   *
   * @param {Object[]}  views
   * @param {String}    views[].url
   *
   * @public
   * @memberof HTMLReporter
   */
  async write(views) {
    await this[INIT_HTML]();
    await this[WRITE_SUMMARY_TABLE](views);
    await this[WRITE_COMPLETE_RESULTS](views);
  }

  /**
   * Finish and close HTML file
   *
   * @public
   * @memberof HTMLReporter
   */
  async close() {
    this[OPTIONS].logger.debug('Ending HTML output');
    this[CLOSE_HTML]();
  }
}

/* --- Private Method Implementations --- */
/**
 * Write HTML head and title content
 *
 * @private
 * @memberof HTMLReporter
 */
function initHTML() {
  const writeToFile = this[WRITE_TO_FILE];

  const titleString = `aXe Accessibility Engine Report for ${
    this[OPTIONS].domain
  }  \n${new Date().toString()}`;

  writeToFile(`<!doctype html> <html lang="en"><head><title>${
    titleString
  }</title><meta name="viewport" content="width=device-width, initial-scale=1">${STYLE_SHEETS}<style>${CSS}</style></head><body><div class="container"><div class="row"><div class="col-xs-12">${marked(`# ${titleString}`)}`);
  writeToFile(marked('This report is not a complete accessibility audit.  This report only documents those accessibility features tested by the axe-core library, and should not be considered exhaustive of the possible accessibility issues a website may have.  Use this report as a tool in a complete and comprehensive process of reviewing this site for accessibility issues.  More information regarding the features tested by the axe-core library may be found at [axe-core.org](https://axe-core.org/)'));

  if (this[OPTIONS].random !== 1) {
    writeToFile(marked(`This report represents only a random sample of ${Math.round(this[OPTIONS].random * 100)}% of all webpages on this domain.`));
  }
}

function testResultList(reports, type) {
  const resultList = new Set();
  reports[type].forEach(({ viewPort, report }) => {
    const reportObject = JSON.parse(report);
    reportObject.forEach(({ description }) => {
      this[TOTALS][type] += 1;
      resultList.add(`* ${escape(description)}\n`);
    });
  });

  return resultList.size > 0
    ? marked([...resultList].reduce((list, item) => list + item, ''))
    : `No ${type} detected by axe-core`;
}

/**
 * Write a summary table of axe-core test results to the HTML file.
 *
 * @param {Object[]}    testedURLs
 * @param {String}      testedURLs[].url
 *
 * @private
 * @memberof HTMLReporter
 */
async function writeSummaryTable(testedURLs) {
  const writeToFile = this[WRITE_TO_FILE];

  writeToFile(marked('## Summary of Overall Test Results'));
  writeToFile('<table class="summary-table"><thead><tr><th scope="col">URL</th><th scope="col">Failing Tests</th><th scope="col">Passing Tests</th></tr></thead><tbody>');

  await Promise.all(testedURLs.map(async ({ url }) => {
    const reports = await this[OPTIONS].db.read('summary', { url });
    await writeToFile(`<tr><th scope="row">${url}</th>`);
    await writeToFile(`<td>${testResultList.call(this, reports, 'violations')}</td>`);
    await writeToFile(`<td>${testResultList.call(this, reports, 'passes')}</td></tr>`);
  }));

  writeToFile('</tbody></table>');
}

/**
 * Write closing tags and close HTML file
 *
 * @private
 * @memberof HTMLReporter
 */
function closeHTML() {
  const writeToFile = this[WRITE_TO_FILE];

  writeToFile('<script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script><script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.3/js/bootstrap.min.js" integrity="sha384-a5N7Y/aK3qNeh15eJKGWxsqtnX/wWdSZSKp+81YjTmS15nvnvxKHuzaWwXHDli+4" crossorigin="anonymous"></script>');
  writeToFile('</body><script></script></html>');

  fs.closeSync(this[FILE_NAME]);
}

function countResults(violations) {
  return violations.reduce((sum, { viewPort, url, report }) => {
    const result = JSON.parse(report);
    return sum + result.length;
  }, 0);
}

function writeNodeMessages(list, {
  html, any, all, none,
}) {
  /* eslint-disable no-param-reassign */
  list += `<li>${escape(html)}`;
  any.forEach(({ message }) => {
    list += `<br />${escape(message)}`;
  });
  all.forEach(({ message }) => {
    list += `<br />${escape(message)}`;
  });
  none.forEach(({ message }) => {
    list += `<br />${escape(message)}`;
  });
  list += '</li>';
  return list;
  /* eslint-enable no-param-reassign */
}

function printViewCounts(reports, reportType) {
  /* eslint-disable no-param-reassign */
  let body = '<ul class="view-counts" >';
  reports.forEach(({ viewPort, report: results }) => {
    const resultsObject = JSON.parse(results);
    body += `<li class="row" style="list-style: none; height: 15px;"><div class="col-2"><p>${
      viewPort
    }:</p></div><div class="col-10"><p>${resultsObject.length} ${reportType}</p></div></li>`;
  });
  body += '</ul>';
  return body;
  /* eslint-enable no-param-reassign */
}

/**
 * Formats axe-core test data into html string listing the relevant
 * DOM nodes for each test.
 *
 * @param {object}     testResults
 * @param {string}  testResults.viewPort
 * @param {string}  testResults.url
 * @param {string}  testResults.report
 * @param {string} testType
 * @returns {string}
 */
function printResultsList(testResults, testType) {
  const { viewPort, url, report } = testResults;
  const results = JSON.parse(report);
  let html = `<div class="affected-nodes-box"><a href="#${url}-${viewPort}-list" data-toggle="collapse" role="button" aria-expanded="false" aria-controls="${url}-${viewPort}-list"><div class="affected-nodes-title-box"><h4><span>${escape(url)} ${viewPort.toUpperCase()}</span><span>${results.length} ${testType}</span></h4></div><a><div class="affected-nodes-list-box collapse" id="${url}-${viewPort}-list"><ol class="affected-nodes-list">`;
  if (results.length > 0) {
    html += `${results.reduce((item, { description, nodes, impact }) => {
      item += `<li>${impact ? `${impact.toUpperCase()}: ` : ''}${escape(description)}<br />`;
      item += '<span>Affected Nodes: </span><ul>';
      item += nodes.reduce(writeNodeMessages, '');
      item += '</ul></li>';
      return item;
    }, '')}</ol></div></div>`;
    return html;
  }
  return '';
}

/**
 * Write a complete listing all tests and their relevant DOM nodes
 *
 * @param {Object[]}    testedURLs
 * @param {String}      testedURLs[].url
 *
 * @private
 * @memberof HTMLReporter
 */
async function writeCompleteResults(testedURLs) {
  const writeToFile = this[WRITE_TO_FILE];
  writeToFile(marked(`## Detailed List of Failing Tests: ${this[TOTALS].violations} failing tests`));
  await Promise.all(testedURLs.map(async ({ url }) => {
    const violations = await this[OPTIONS].db.read('violations_summary', { url });

    const violationCount = countResults(violations);
    if (violationCount > 0) {
      writeToFile(marked(`### ${escape(url)}`));
      await Promise.all(violations.map(violation => writeToFile(printResultsList(violation, 'failed tests'))));
    }
  }));

  writeToFile(marked(`## Detailed List of Passing Tests: ${this[TOTALS].passes} passing tests`));
  await Promise.all(testedURLs.map(async ({ url }) => {
    const passes = await this[OPTIONS].db.read('passes_summary', { url });

    const passCount = countResults(passes);
    if (passCount > 0) {
      writeToFile(marked(`### ${escape(url)}`));
      await Promise.all(passes.map(passed => writeToFile(printResultsList(passed, 'passing tests'))));
    }
  }));
}
