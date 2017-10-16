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
import logger from './logger';

/**
 * getHref -- helper function to pull the href attribute off a DOM
 * node
 *
 * @param {DOMNode[]} links
 * @returns {string|null}
 */
function getHref(currentURL, links) {
  return (key) => {
    if (links[key].attribs) {
      logger.debug('\nFound Link: ', '\n From: ', `\nTo: ${links[key].attribs.href}\n`);
      const link = links[key].attribs.href;
      return link ? link.replace(new RegExp(`^(?!https?:\/\/)(?!${currentURL}\/)(\/?.*)`), `${currentURL}/$1`) : link;
    }
    return null;
  };
}

/**
 * queueLinks - parses page content and appends all links on the page to existing queue.
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
    return new Set(Object.keys(links)
      .map(getHref(currentURL, links))
      .filter(url => typeof url === 'string')
      .filter(filterFn)
      .map(url => url.replace(/^https:\/\//, 'http://')));
  }
  return new Set();
}

/**
 * combineLinkSets - helper function that reduces an array of sets to a single
 * set.
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
 * crawl - Crawls through page links and builds a set of all pages to test.
 * Goes 5 levels deep through links checking for new pages by default
 *
 * @param {String} domain domain to crawl through
 * @param {Number} depth Levels to recurse through website to find new links.
 * @param {Function} filterFn function to be used to filter out urls (e.g.
 * removeMedia, noFTP, etc.)
 * @returns {Set<String>} queue of all unique links matching filterFn
 */
export default async function crawl(domain, depth = 5, filterFn) {
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

  const allLinks = await queueLinks(domain, mainPage, filterFn);
  let links = new Set([...allLinks]);

  for (let i = 1; i < depth; i += 1) {
    const promisedLinks = [...links].map(axios.get);
    const linkedContent = await Promise.all(promisedLinks)
      .catch((err) => {
        logger.error(`\n${err}\n${err.config.url}\n`);
        return promisedLinks;
      });

    links = linkedContent
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

