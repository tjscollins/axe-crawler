import { isURL } from 'validator';
import webDriver from 'selenium-webdriver';
import chromeDriver from 'selenium-webdriver/chrome';
import axeBuilder from 'axe-webdriverjs';

import { notMedia, matchDomain } from './util';
import polyfills from './polyfills';
import { outputToHTML, outputToJSON } from './output';
import crawl from './crawler';
import crawlerOpts from './config';

/**
 * resultsToReports - function applied by Array.prototype.reduce to array of results to combine for
 *                    printing to reports
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
    console.log(err);
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
function generateReportSaveFn({ output }) {
  return (results) => {
    console.log('Creating reports: ', `${output}.json`, `${output}.html`);
    const reports = results.reduce(resultsToReports, {});
    outputToJSON(`${output}.json`, reports);
    outputToHTML(`${output}.html`, reports);
  };
}

/**
 * createURLViewReducer - generates a callback function for used to reduce list
 * of urls into list of {url, viewPort} combinations
 *
 * @param {Object} globalOptions
 * @returns {Function} callback function for reduce
 */
function createURLViewReducer(globalOptions) {
  return (links, url) => {
    globalOptions.viewPorts.forEach((viewPort) => {
      links.push({ url, viewPort });
    });
    return links;
  };
}

/**
 * testPage - runs axe-core tests for supplied testCase.  Returns the results
 *  of that test.
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
  const { url, viewPort: { name, width, height } } = testCase;
  const options = new chromeDriver.Options();
  options.addArguments('headless', 'disable-gpu', `--window-size=${width},${height}`);
  const driver = new webDriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  let outputReport = null;
  await driver.get(url)
    .then(() => {
      console.log('Testing: ', url, name);
      axeBuilder(driver)
        .analyze((results) => {
          outputReport = results;
        });
    }).then(() => driver.close());
  return {
    result: outputReport,
    viewPort: testCase.viewPort,
  };
}

function filterLinks(domain) {
  return link => isURL(link) &&
    notMedia(link) &&
    matchDomain(domain)(link);
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
  const domain = opts.domains.pop();

  // Create Queue of links on main page
  console.log(`Crawling ${domain} to depth of:  ${opts.depth}`);
  const linkQueue = await crawl(domain, opts.depth, filterLinks(domain));

  console.log(`Found ${linkQueue.size} links within ${domain}`);
  console.log('Total urls to test:', Math.min(opts.check, linkQueue.size));
  console.log(`Testing ${opts.viewPorts.length} views: `);
  opts.viewPorts.forEach((viewPort) => {
    console.log(`\t${viewPort.name}: ${viewPort.width}x${viewPort.height}`);
  });

  // Test each link
  Promise.all([...linkQueue]
    .reduce(createURLViewReducer(opts), [])
    .slice(0, opts.check * opts.viewPorts.length)
    .map(testPage))
    .then(generateReportSaveFn(opts))
    .catch(console.log);
}

polyfills();
main();
