import { isURL } from 'validator';
import axios from 'axios';
import cheerio from 'cheerio';
import { filterLinks } from './util';

/* --- Symbols for Private Members --- */

// Values
const OPTIONS = Symbol('Options');
const UNIQUE_LINKS = Symbol('Set of unique links to be tested');

// Methods
const QUEUE_LINKS = Symbol('Add all links on a page to UNIQUE_LINKS');
const FILTER_LINKS = Symbol('Filter out broken, invalid, media, etc. links');

/* --- Class Declaration and Public Method Implementations --- */
export default class AxeCrawler {
  constructor(opts) {
    // Values
    this[OPTIONS] = opts;
    this[UNIQUE_LINKS] = new Set();

    // Methods
    this[QUEUE_LINKS] = queueLinks.bind(this);
    this[FILTER_LINKS] = filterLinks(opts);
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
  async crawl() {
    const { domain, depth = 5, logger } = this[OPTIONS];

    // Validate url and throw error if invalid, else add to unique set
    const url = `http://${domain}`;
    if (!isURL(url)) {
      throw new Error(`Invalid url: ${url}`);
    }
    this[UNIQUE_LINKS].add(url);

    // Fast return initial url if depth === 0
    if (depth === 0) {
      return this[UNIQUE_LINKS];
    }

    try {
      logger.debug(`Crawling ${url}`);
      let links = this[UNIQUE_LINKS];

      for (let i = 0; i < depth; i += 1) {
        logger.debug(`Crawling for links at DEPTH ${i}`);
        const promisedLinks = [...links]
          .map(axios.get)
          .map(request => request.catch(err => err));
        const linkedContent = await Promise.all(promisedLinks);

        links = linkedContent
          .filter(content => !(content instanceof Error))
          .map(newPage => this[QUEUE_LINKS](domain, newPage))
          .reduce(combineLinkSets, new Set())
          .difference(this[UNIQUE_LINKS]);

        if (links.size === 0) {
          break;
        }

        for (const address of links) {
          this[UNIQUE_LINKS].add(address);
        }
      }
      return this[UNIQUE_LINKS];
    } catch (err) {
      logger.error('Error crawling for links: ', err);
      return process.exit(1);
    }
  }
}

/* --- Private Method Implementations --- */

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
function queueLinks(domain, pageContent) {
  if (pageContent === undefined) {
    return new Set();
  }
  if (pageContent.status === 200) {
    const links = cheerio.load(pageContent.data)('a');
    const currentURL = pageContent.config.url;

    return new Set(Object.keys(links)
      .map(getHref(currentURL, links))
      .filter(url => typeof url === 'string')
      .filter(this[FILTER_LINKS])
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
function combineLinkSets(urlList, urlSet) {
  if (urlList instanceof Set) {
    for (const address of urlList) {
      urlSet.add(address);
    }
    return urlSet;
  }
  return urlSet;
}

