import webDriver from 'selenium-webdriver';
import chromeDriver from 'selenium-webdriver/chrome';
import axeBuilder from 'axe-webdriverjs';

import { filterLinks, selectSampleSet, isNatural } from './util';
import polyfills from './polyfills';
import { outputToHTML, outputToJSON } from './output';
import crawl from './crawler';
import crawlerOpts from './config';
import logger from './logger';

/**
 * resultsToReports - function applied by Array.prototype.reduce to array of
 * results to combine for printing to reports
 *
 * @param {Object} reports
 * @param {Object} result
 * @param {Object} viewPort
 * @returns {Object}
 */
function resultsToReports(reports, { result, viewPort }) {
  try {
    /* eslint-disable no-param-reassign */
    reports[result.url] = Object.assign({
      violations: {},
      passes: {},
    }, reports[result.url]);

    reports[result.url].violations[viewPort.name] = result.violations;
    reports[result.url].passes[viewPort.name] = result.passes;

    /* eslint-enable no-param-reassign */
  } catch (err) {
    logger.error(err);
  }
  return reports;
}

/**
 * generateReportSaveFn - output the results of axe-core's test to HTML and
 * JSON formats
 *
 * @param {Object} globalOptions
 * @returns {Function} callback function to print results of axe-core tests.
 */
function generateReportSaveFn(opts) {
  const { output } = opts;
  return (results) => {
    logger.debug('Creating reports: ', `${output}.json`, `${output}.html`);
    const reports = results.reduce(resultsToReports, {});
    outputToJSON(`${output}.json`, reports);
    outputToHTML(`${output}.html`, reports, opts);
  };
}

/**
 * Generates a callback function for used to reduce list of urls into
 * list of {url, viewPort} combinations
 *
 * @param {Object} globalOptions
 * @returns {Function} callback function for reduce
 */
function createURLViewSet(globalOptions) {
  return (links, url) => {
    globalOptions.viewPorts.forEach((viewPort) => {
      links.push({ url, viewPort });
    });
    return links;
  };
}

/**
 * runs axe-core tests for supplied testCase.  Returns the results of
 * that test.
 *
 * @param {Object} testCase
 * @param {string} testCase.url url of the testCase
 * @param {Object} testCase.viewPort
 * @param {string} testCase.viewPort.name name of this viewPort (e.g. mobile or
 *  desktop)
 * @param {number} testCase.viewPort.width
 * @param {number} testCase.viewPort.height
 */
async function testPage(testCase) {
  logger.debug('Test case: ', testCase);
  const { url, viewPort: { name, width, height }, viewPort } = testCase;
  const options = new chromeDriver.Options();
  options.addArguments('headless', 'disable-gpu', `--window-size=${width},${height}`);
  const driver = new webDriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  const outputReport = await new Promise((resolve, reject) => {
    logger.info(`Getting ${url}`);
    driver.get(url).then(() => {
      logger.info(`Testing ${url} ${name}`);
      axeBuilder(driver)
        .analyze((result, err) => {
          if (err) {
            reject(err);
          }
          logger.debug(`Results for ${url} ${name} received`);
          resolve({ result, viewPort });
          driver.close();
        });
    });
  });
  return outputReport;
}

/**
 * main - main function to start scraping the website, build the queue of
 *  individual pages and run axe tests on each page
 *
 * @param {string} url homepage of website to be scraped and tested.
 */
async function main() {
  // Read config
  const opts = crawlerOpts();
  const domain = opts.domains.last();

  logger.debug('Crawling with options: \n', opts);

  // Create Queue of links on main page
  const linkQueue = await crawl(domain, opts.depth, filterLinks(opts));

  logger.info(`Found ${linkQueue.size} links within ${domain}`);
  logger.debug('Queue to be tested: ', linkQueue);
  const numToCheck = Math.min(isNatural(opts.check) ? opts.check : Infinity, linkQueue.size);
  logger.info(`Based on options, testing ${numToCheck} urls`);
  if (opts.random > 0 && opts.random < 1) {
    logger.info(`Selecting random sample ${opts.random} of total`);
  } else {
    opts.random = 1;
  }
  logger.debug(`Testing ${opts.viewPorts.length} views: `);
  opts.viewPorts.forEach((viewPort) => {
    logger.debug(`\t${viewPort.name}: ${viewPort.width}x${viewPort.height}`);
  });

  // Test each link
  Promise.all([...linkQueue]
    .reduce(selectSampleSet(opts), [])
    .reduce(createURLViewSet(opts), [])
    .slice(0, numToCheck)
    .map(testPage))
    .then(generateReportSaveFn(opts))
    .catch(logger.error);
}

polyfills();
main();
