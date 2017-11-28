import webDriver from 'selenium-webdriver';
import chromeDriver from 'selenium-webdriver/chrome';
import axeBuilder from 'axe-webdriverjs';

import { isNatural, selectSampleSet, createURLViewSet } from './util';
import HTMLReporter from './reporters/HtmlReporter';
import JSONReporter from './reporters/JSONReporter';

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
const CREATE_TEST_VIEWS = Symbol('Create a list of views to test');


export default class TestRunner {
  constructor(opts) {
    this[OPTIONS] = opts;
    this[TEST_PAGE] = testPage.bind(this);
    this[SAMPLE] = selectSampleSet(this[OPTIONS]);
    this[CREATE_TEST_VIEWS] = createURLViewSet(this[OPTIONS]);
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

  /**
   * Generate HTML and JSON reports
   *
   * @memberof TestRunner
   */
  async report() {
    const { logger, db } = this[OPTIONS];
    const testedPages = await db.read('tested_pages');

    logger.info('Saving JSON report');
    const json = new JSONReporter(this[OPTIONS]);
    await json.open();
    await json.write(testedPages);
    await json.close();

    logger.info('Saving HTML Report');
    const html = new HTMLReporter(this[OPTIONS]);
    await html.open();
    await html.write(testedPages);
    await html.close();
  }
}

/* --- Private Methods --- */
/**
 * Launches chromedriver and injects aXe testing library for a given testCase
 *
 * @param {Object}          testCase
 * @param {String}          testCase.url
 * @param {Object}          testCase.viewPort
 * @param {String}          testCase.viewPort.name
 * @param {Number|String}   testCase.viewPort.height
 * @param {Number|String}   testCase.viewPort.width
 *
 * @private
 * @memberof TestRunner
 */
async function testPage(testCase) {
  const { logger, db } = this[OPTIONS];

  try {
    const { url, viewPort: { name, width, height } } = testCase;

    const options = new chromeDriver.Options();
    options.addArguments(
      'headless',
      'disable-gpu',
      `--window-size=${width},${height}`,
    );

    const driver = new webDriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const report = await new Promise((resolve, reject) => {
      driver.get(url).then(() => {
        logger.debug('Test case: ', testCase);
        logger.info(`Got ${url}`);
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
