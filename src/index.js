import AxeCrawler from './AxeCrawler';
import AxeCrawlerConfiguration from './AxeCrawlerConfiguration';
import TestRunner from './TestRunner';
import polyfills from './polyfills';

/**
 * main - main function to start scraping the website, build the queue of
 *  individual pages and run axe tests on each page
 *
 * @param {string} url homepage of website to be scraped and tested.
 */
async function main() {
  const opts = new AxeCrawlerConfiguration();
  opts.reportVersion();

  const axeCrawler = new AxeCrawler(opts);
  const linkQueue = await axeCrawler.crawl();
  opts.setNumberToCheck(linkQueue);

  const {
    logger,
    viewPorts,
    random,
    domain,
  } = opts;

  logger.debug('Queue to be tested: ', JSON.stringify(linkQueue, null, 4));
  logger.info(
    `Found ${linkQueue.size} links within ${domain}`,
    `Based on options, testing ${opts.numToCheck} urls`,
  );
  if (random > 0 && random < 1) {
    logger.info(`Selecting random sample: ${random} of ${opts.numToCheck} urls`);
  }

  await opts.configureDB();

  let viewPortString = '';
  viewPorts.forEach(({
    name,
    width,
    height,
  }) => {
    viewPortString += `\t\t${name}: ${width}x${height}\n`;
  });
  logger.debug(`Testing ${viewPorts.length} viewPorts: \n${viewPortString}`);

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
