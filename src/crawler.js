/**
 * @fileOverview Basic webcrawler function -- uses sets to build a queue of
 * links to be returned
 *
 * @name crawler.js
 * @author Tyler Collins
 * @license MIT
 */
import { isURL } from 'validator';
import axios from 'axios';
import cheerio from 'cheerio';

/**
 * Generates a helper function to pull the href attribute off a DOM
 * anchor node
 *
 * @param {string} currentURL
 * @param {DOMNode[]} links
 * @returns {Function}
 */
function getHref(currentURL, links) {
  const currentDomain = currentURL.replace(new RegExp('^(https?://(\\w+\\.?)+)/(.*)$'), '$1');
  return (key) => {
    if (links[key].attribs) {
      const link = links[key].attribs.href;
      if (link) {
        return link
          .replace(new RegExp(`^(?!https?://)(?!${currentURL}/)(/?)(.*)`), `${currentDomain}/$2`)
          .replace(new RegExp(`^${currentDomain}//`), 'http://');
      }
    }
    return null;
  };
}

/**
 * Parses page content and appends all links on the page to existing queue.
 *
 * @param {Promise} pageContent axios response containing page data to be
 * parsed
 * @param {Function} filterFn function to be used to filter out urls (e.g.
 * removeMedia, noFTP, etc.)
 */
export function queueLinks(domain, pageContent, filterFn = x => true) {
  if (pageContent === undefined) {
    return new Set();
  }
  if (pageContent.status === 200) {
    const links = cheerio.load(pageContent.data)('a');
    const currentURL = pageContent.config.url;
    // console.log(pageContent.config);
    return new Set(Object.keys(links)
      .map(getHref(currentURL, links))
      .filter(url => typeof url === 'string')
      .filter(filterFn)
      .map(url => url.replace(/^https:\/\//, 'http://')));
  }
  return new Set();
}

/**
 * Reducer function that reduces an array of sets to a single set.
 *
 * @param {Set<string>} urlList
 * @param {Set<string>} urlSet
 * @returns {Set<string>}
 */
export function combineLinkSets(urlList, urlSet) {
  if (urlList instanceof Set) {
    for (const address of urlList) {
      urlSet.add(address);
    }
    return urlSet;
  }
  return urlSet;
}

/**
 * Crawls through page links and builds a set of all pages to test.
 * Goes 5 levels deep through links checking for new pages by default
 *
 * @export
 * @param {String} domain domain to crawle for links
 * @param {any} { depth = 5, logger } Options object
 * @param {Function} filterFn filter function to apply to list of links
 * @returns
 */
export default async function crawl(domain, { depth = 5, logger }, filterFn) {
  // Validate url and throw error if invalid
  const url = `http://${domain}`;
  if (!isURL(url)) {
    throw new Error(`Invalid url: ${url}`);
  }

  // Return initial url if depth === 0
  if (depth === 0) {
    return new Set([url]);
  }

  // Scrape main url
  const mainPage = await axios.get(url).catch(logger.error);
  logger.debug('Crawling for links at DEPTH 0');
  const allLinks = await queueLinks(domain, mainPage, filterFn);
  let links = new Set([...allLinks]);

  for (let i = 1; i < depth; i += 1) {
    logger.debug(`Crawling for links at DEPTH ${i}`);
    const promisedLinks = [...links]
      .map(axios.get)
      .map(request => request.catch(err => err));
    const linkedContent = await Promise.all(promisedLinks);

    links = linkedContent
      .filter(content => !(content instanceof Error))
      .map(newPage => queueLinks(domain, newPage, filterFn))
      .reduce(combineLinkSets, new Set())
      .difference(allLinks);

    if (links.size === 0) {
      i = depth;
    }

    for (const address of links) {
      allLinks.add(address);
    }
  }
  return allLinks;
}

