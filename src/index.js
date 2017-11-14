import webDriver, { logging } from 'selenium-webdriver';
import chromeDriver from 'selenium-webdriver/chrome';
import axeBuilder from 'axe-webdriverjs';

import { filterLinks, selectSampleSet, isNatural } from './util';
import polyfills from './polyfills';
import { outputToHTML, outputToJSON } from './output';
import crawl from './crawler';
import crawlerOpts from './config';

/**
 * returns curried function with access to logger
 *
 * @param {any} { logger }
 * @returns
 */
function resultsToReports({ logger }) {
  /**
   * resultsToReports - function applied by Array.prototype.reduce to array of
   * results to combine for printing to reports
   *
   * @param {Object} reports
   * @param {Object} result
   * @param {Object} viewPort
   * @returns {Object}
   */
  return (reports, { result, viewPort }) => {
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
  };
}

/**
 * generateReportSaveFn - output the results of axe-core's test to HTML and
 * JSON formats
 *
 * @param {Object} globalOptions
 * @returns {Function} callback function to print results of axe-core tests.
 */
function generateReportSaveFn(opts) {
  const { output, logger } = opts;
  return (results) => {
    logger.debug('Creating reports: ', `${output}.json`, `${output}.html`);
    const reports = results.reduce(resultsToReports(opts), {});
    outputToJSON(`${output}.json`, reports, opts);
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
function createURLViewSet(opts) {
  return (links, url) => {
    opts.viewPorts.forEach((viewPort) => {
      links.push({ url, viewPort });
    });
    return links;
  };
}
/**
 * returns a test function with access to the logger
 *
 * @param {any} { logger }
 * @returns
 */
function testPage({ logger, verbose }) {
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
  return async (testCase) => {
    try {
      logger.debug('Test case: ', testCase);
      const { url, viewPort: { name, width, height }, viewPort } = testCase;

      const chromeLoggingPrefs = new webDriver.logging.Preferences();
      chromeLoggingPrefs.setLevel(webDriver.logging.Type.BROWSER, webDriver.logging.Level.OFF);
      chromeLoggingPrefs.setLevel(webDriver.logging.Type.CLIENT, webDriver.logging.Level.OFF);

      const options = new chromeDriver.Options();
      // options.setLoggingPrefs(chromeLoggingPrefs);
      options.addArguments('headless', 'disable-gpu', `--window-size=${width},${height}`);

      const driver = new webDriver.Builder()
        .setLoggingPrefs(chromeLoggingPrefs)
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
              resolve({ result, viewPort });
              driver.close();
            });
        });
      });
      return report;
    } catch (err) {
      logger.error('Error encountered in using Selenium Webdriver: ');
      logger.error(err);
      process.exit(1);
    }
  };
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
  const {
    logger, check, viewPorts, random, domain,
  } = opts;


  logger.debug('Crawling with options: \n', opts);

  // Create Queue of links on main page
  const linkQueue = await crawl(domain, opts, filterLinks(opts));

  logger.info(`Found ${linkQueue.size} links within ${domain}`);
  logger.debug('Queue to be tested: ', linkQueue);
  const numToCheck = Math.min(
    isNatural(check) ? check : Infinity,
    linkQueue.size,
  );
  logger.info(`Based on options, testing ${numToCheck} urls`);

  if (random > 0 && random < 1) {
    logger.info(`Selecting random sample ${random} of total`);
  } else {
    opts.random = 1;
  }

  logger.debug(`Testing ${opts.viewPorts.length} views: `);
  viewPorts.forEach((viewPort) => {
    logger.debug(`\t${viewPort.name}: ${viewPort.width}x${viewPort.height}`);
  });

  // Test each link
  Promise.all([...linkQueue]
    .reduce(selectSampleSet(opts), [])
    .slice(0, numToCheck)
    .reduce(createURLViewSet(opts), [])
    .map(testPage(opts)))
    .then(generateReportSaveFn(opts))
    .catch(opts.logger.error);
}

polyfills();
main();
