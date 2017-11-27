import { filterLinks, isNatural } from './util';
import polyfills from './polyfills';
import crawl from './crawler';
import crawlerOpts from './config';
import DB from './db/index';
import TestRunner from './TestRunner';

// Number of page views at which to switch from in-memory DB to filesystem DB
const USE_FILE_DB = 50;

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
    logger.info(`Selecting random sample: ${random} of ${numToCheck} urls`);
  } else {
    opts.random = 1;
  }

  const viewsToTest = opts.random * numToCheck * viewPorts.length;
  if (viewsToTest > USE_FILE_DB) {
    logger.info(`Over ${USE_FILE_DB} page views to test, switching to SQLite file mode to store results`);
    opts.db = new DB({ type: 'file' });
  } else {
    logger.debug(`Fewer than ${USE_FILE_DB} page views, using in-memory SQLite to store results`);
    opts.db = new DB({ type: 'memory' });
  }

  await opts.db.initialize();

  logger.debug(`Testing ${opts.viewPorts.length} viewPorts: `);
  viewPorts.forEach((viewPort) => {
    logger.debug(`\t${viewPort.name}: ${viewPort.width}x${viewPort.height}`);
  });

  try {
    Object.freeze(opts);
    const runner = new TestRunner(opts);
    await runner.queue(linkQueue);
    await runner.run();
    await runner.report();
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
  process.exit(0);
}

polyfills();
main();
