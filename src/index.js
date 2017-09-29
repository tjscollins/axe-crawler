#!/usr/bin/env node

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
 * @param {object} reports
 * @param {object} result
 * @param {object} viewPort
 * @returns {object}
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
 * @param {object} globalOptions
 * @returns {fn} callback function to print results of axe-core tests.
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
 * @param {object} globalOptions
 * @returns {fn} callback function for reduce
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
 * testPage - runs axe-core tests on a page at the supplied url.  Returns the results of that test.
 *
 * @param {string} url address of the page to be tested with axe-core
 */
async function testPage({ url, viewPort }) {
  const options = new chromeDriver.Options();
  options.addArguments('headless', 'disable-gpu', `--window-size=${viewPort.width},${viewPort.height}`);
  const driver = new webDriver.Builder().forBrowser('chrome').setChromeOptions(options).build();
  let outputReport = null;
  await driver.get(url)
    .then(() => {
      console.log('Testing: ', url, viewPort.name);
      axeBuilder(driver)
        .analyze((results) => {
          outputReport = results;
        });
    }).then(() => driver.close());
  return {
    result: outputReport,
    viewPort,
  };
}

function filterLinks(domain) {
  return link => isURL(link) &&
    notMedia(link) &&
    matchDomain(domain)(link);
}

/**
 * main - main function to start scraping the website, build the queue of individual pages
 *        and run axe tests on each page
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
  console.log('Total urls to test:', opts.check || linkQueue.size);

  // Test each link
  Promise.all([...linkQueue]
    .reduce(createURLViewReducer(opts), [])
    .slice(0, opts.check)
    .map(testPage))
    .then(generateReportSaveFn(opts))
    .catch(console.log);
}

polyfills();
main();
