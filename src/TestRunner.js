import webDriver from 'selenium-webdriver';
import chromeDriver from 'selenium-webdriver/chrome';
import axeBuilder from 'axe-webdriverjs';

import { isNatural, selectSampleSet, createURLViewSet } from './util';
import { outputToHTML, CSS_STYLES } from './output';
import HTMLReporter from './reporters/HtmlReporter';

/* --- Symbols for Private Members --- */

/**
 * Values
 */
const OPTIONS = Symbol('Options');
const QUEUE = Symbol('Queue');

/**
 * Methods
 */
const SAMPLE = Symbol('Take a random sample');
const TEST_PAGE = Symbol('Run axe-core tests on a page');
const HTML_REPORT = Symbol('Generate HTML report');
const CREATE_TEST_VIEWS = Symbol('Create a list of views to test');


export default class TestRunner {
  constructor(opts) {
    this[OPTIONS] = Object.assign({}, opts);
    this[TEST_PAGE] = testPage.bind(this);
    this[SAMPLE] = selectSampleSet(this[OPTIONS]);
    this[CREATE_TEST_VIEWS] = createURLViewSet(this[OPTIONS]);
    // this[HTML_REPORT] = createHTMLReport.bind(this);
  }

  /**
   * Prepare a queue of urls to test
   *
   * @param {Set<string>} queue
   * @memberof TestRunner
   */
  queue(queue) {
    const { check } = this[OPTIONS];
    const numToCheck = Math.min(
      isNatural(check) ? check : Infinity,
      queue.size,
    );
    this[QUEUE] = [...queue]
      .reduce(this[SAMPLE], [])
      .slice(0, numToCheck)
      .reduce(this[CREATE_TEST_VIEWS], []);
  }

  /**
   * Run axe-core tests on each url-view combination
   *
   * @memberof TestRunner
   */
  async run() {
    await Promise.all(this[QUEUE].map(this[TEST_PAGE]));
  }

  async report() {
    // this[OPTIONS].db.read('axe_result', { url: 'http://cnmipss.org', viewPort: 'desktop' });

    const views = await this[OPTIONS].db.read('tested_pages');

    // Output Results to JSON

    // Output Results to HTML
    const html = new HTMLReporter(this[OPTIONS]);
    await html.open();
    await html.write(views);
    this[OPTIONS].logger.debug('Closing HTMLReporter');
    html.close();
  }
}

/* --- Private Methods --- */
async function testPage(testCase) {
  const { logger, db } = this[OPTIONS];
  try {
    logger.debug('Test case: ', testCase);
    const { url, viewPort: { name, width, height } } = testCase;

    const options = new chromeDriver.Options();
    options.addArguments('headless', 'disable-gpu', `--window-size=${width},${height}`);

    const driver = new webDriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const report = await new Promise((resolve, reject) => {
      logger.info(`Getting ${url}`);
      driver.get(url).then(() => {
        logger.info(`Testing ${url} ${name}`);
        axeBuilder(driver)
          .analyze((result, err) => {
            if (err) {
              reject(err);
            }
            logger.debug(`Results for ${url} ${name} received`);
            resolve(result);
            driver.close();
          });
      });
    });
    await db.create('axe_result', {
      url,
      violations: JSON.stringify(report.violations),
      passes: JSON.stringify(report.passes),
      viewPort: `${name}:${width}x${height}`,
    });
  } catch (err) {
    logger.error('Error encountered in using Selenium Webdriver: ');
    logger.error(err);
    process.exit(1);
  }
}


/**
 * generateReportSaveFn - output the results of axe-core's test to HTML and
 * JSON formats
 *
 * @param {Object} globalOptions
 * @returns {Function} callback function to print results of axe-core tests.
 */
function generateReportSaveFn(opts) {
  const { output, logger, sql } = opts;
  return async (results) => {
    logger.debug('Creating reports: ', `${output}.json`, `${output}.html`);
    const reports = results.reduce(resultsToReports(opts), {});
    if (sql) {
      await Promise.all(Object.keys(reports).map(async (url) => {
        await opts.db.create('axe_result', {
          url,
          violations: JSON.stringify(reports[url].violations),
          viewPort: 'test viewPort',
        });
      }));
    } else {
      outputToJSON(`${output}.json`, reports, opts);
    }
  };
}

function createHTMLReport(reports) {
  initHTML.call(this);
//   outputToHTML(`${this[OPTIONS].output}.html`, reports, this[OPTIONS]);
}

