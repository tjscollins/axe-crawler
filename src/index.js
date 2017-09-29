#!/usr/bin/env node

import {
  removeMedia,
  matchDomain,
} from './util';
import polyfills from './polyfills';
import {
  outputToHTML,
  outputToJSON,
} from './output';
import crawl from './crawler';
import crawlerOpts from './config';

const axeBuilder = require('axe-webdriverjs');
const chromeDriver = require('selenium-webdriver/chrome');
const webDriver = require('selenium-webdriver');

/**
 * saveReports - output the results of axe-core's test to HTML and JSON formats
 *
 * @param {object} results
 */
function saveReports(results) {
  console.log('Creating reports: ', `${OUTPUT}.json`, `${OUTPUT}.html`);
  const reports = results.reduce(resultsToReports, {});
  outputToJSON(`${OUTPUT}.json`, reports);
  outputToHTML(`${OUTPUT}.html`, reports);
}

/**
 * resultsToReports - function applied by Array.prototype.reduce to array of results to combine for
 *                    printing to reports
 *
 * @param {object} reports
 * @param {object} result
 * @param {object} view
 * @returns {object}
 */
function resultsToReports(reports, { result, view }) {
  try {
    reports[result.url] = Object.assign({
      violations: {},
      passes: {},
    }, reports[result.url]);

    reports[result.url].violations[view.name] = result.violations;
    reports[result.url].passes[view.name] = result.passes;
    // reports[result.url].incompletes[view.name] = result.incompletes;
  } catch (err) {
    console.log(err);
  }
  return reports;
}

/**
 * urlForEachView - generates a callback function for used to reduce list of
 * urls into list of {url, viewPort} combinations
 *
 * @param {object} globalOptions
 * @returns {fn} callback function for reduce
 */
function urlForEachView(globalOptions) {
  return (links, url) => {
    globalOptions.viewPorts.forEach((view) => {
      links.push({ url, view });
    });
    return links;
  };
}

/**
 * testPage - runs axe-core tests on a page at the supplied url.  Returns the results of that test.
 *
 * @param {string} url address of the page to be tested with axe-core
 */
async function testPage({
  url,
  view,
}) {
  const options = new chromeDriver.Options();
  options.addArguments('headless', 'disable-gpu', `--window-size=${view.width},${view.height}`);
  const driver = new webDriver.Builder().forBrowser('chrome').setChromeOptions(options).build();
  let outputReport = null;
  await driver.get(url)
    .then(() => {
      console.log('Testing: ', url, view.name);
      axeBuilder(driver)
        .analyze((results) => {
          outputReport = results;
        });
    }).then(() => driver.close());
  return {
    result: outputReport,
    view,
  };
}

function filterLinks(domain) {
  return links => new Set([...links]
    .filter(removeMedia)
    .filter(matchDomain(domain)));
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
    .reduce(urlForEachView(opts), [])
    .slice(0, opts.check)
    .map(testPage))
    .then(saveReports)
    .catch(console.log);
}

polyfills();
main();
