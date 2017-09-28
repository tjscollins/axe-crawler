/**
 * @fileOverview Basic webcrawler function -- uses sets to build a queue of links as output
 * @name crawler.js
 * @author Tyler Collins
 * @license MIT
 */
const axios = require('axios');
const cheerio = require('cheerio');

const {
  isURL,
} = require('validator');

/**
 * buildLinkQueue - Crawls through page links and builds a set of all pages to
 *                  test.  Goes 5 levels deep through links checking for new
 *                  pages by default
 *
 * @param {object} pageContent Promise returned by axios.get
 * @param {int} depth Levels to recurse through website to find new links.
 */
export default async function crawl(domain, depth = 5, filterFn) {
  // Validate url and throw error if invalid
  const url = `http://${domain}`;
  if (!isURL(url)) {
    throw new Error(`Invalid url: ${url}`);
  }

  // Scrape main url
  const mainPage = await axios.get(url);

  const allLinks = filterFn(await queueLinks(domain, mainPage, null));
  let links = new Set([...allLinks]);

  for (let i = 1; i < depth; i++) {
    if (links.size == 0) {
      i = depth;
    }
    const newLinks = await Promise.all([...links].map(async (url) => {
      const newPage = await axios.get(url);
      return filterFn(queueLinks(domain, newPage, null));
    }));

    const newLinkSet = newLinks
      .reduce((urlList, urlSet) => {
        if (urlList instanceof Set) {
          for (const url of urlList) {
            urlSet.add(url);
          }
          return urlSet;
        }
        return urlSet;
      }, new Set([]));
    links = newLinkSet.difference(allLinks);
    for (const url of newLinkSet) {
      allLinks.add(url);
    }
  }
  return allLinks;
}

/**
 * queueLinks - parses page content and appends all links on the page to existing queue.
 *
 * @param {object} pageContent html string holding the content of the page to be parsed
 * @param {set} existingQueue a set of existing links that new links will be added to.  Queue should be a set.
 */
export function queueLinks(domain, pageContent, existingQueue) {
  if (pageContent.status == 200) {
    const links = cheerio.load(pageContent.data)('a');
    return new Set(Object.keys(links)
      .map((n) => {
        if (links[n].attribs) {
          return links[n].attribs.href;
        }
        return null;
      })
      .filter(url => typeof url === 'string')
      .filter(url => isURL(url))
      .map(url => url.replace(/^https/, 'http')));
  }
  console.log(Error(`Website returned an error: ${pageContent.status}`));
  return new Set();
}
