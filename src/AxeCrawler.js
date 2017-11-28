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
const BATCH_GET_CONTENT = Symbol('Perform axios.get on each url in an array and return array of completed responses');
const BATCH_PARSE_LINKS = Symbol('Build a set of links scraped from an array of axios reponses');

/* --- Class Declaration and Public Method Implementations --- */
export default class AxeCrawler {
  /**
   * Creates an instance of AxeCrawler.
   * @param {AxeCrawlerConfiguration}      opts
   * @memberof AxeCrawler
   */
  constructor(opts) {
    // Values
    this[OPTIONS] = opts;
    this[UNIQUE_LINKS] = new Set();

    // Methods
    this[QUEUE_LINKS] = queueLinks.bind(this);
    this[FILTER_LINKS] = filterLinks(opts);
    this[BATCH_GET_CONTENT] = batchGetContent.bind(this);
    this[BATCH_PARSE_LINKS] = batchParseLinks.bind(this);
  }

  /**
   * Crawls through page links and builds a set of all pages to test.
   * Goes 5 levels deep through links checking for new pages by default
   *
   * @returns {Set<string>} this[UNIQUE_LINKS]
   *
   * @public
   * @memberof AxeCrawler
   */
  async crawl() {
    const { domain, depth = 5, logger } = this[OPTIONS];

    // Validate url and throw error if invalid, else add to unique set
    const firstUrl = `http://${domain}`;
    if (!isURL(firstUrl)) {
      throw new Error(`Invalid url: ${firstUrl}`);
    }
    this[UNIQUE_LINKS].add(firstUrl);

    // Fast return if depth === 0
    if (depth === 0) {
      return this[UNIQUE_LINKS];
    }

    try {
      logger.debug(`Crawling ${firstUrl}`);
      let links = this[UNIQUE_LINKS];

      for (let i = 0; i < depth; i += 1) {
        logger.debug(`Crawling for links at DEPTH ${i + 1}`);

        const linkedContent = await this[BATCH_GET_CONTENT](links);
        links = this[BATCH_PARSE_LINKS](linkedContent);

        if (links.size === 0) {
          break;
        }

        logger.debug(`${links.size} links found`);

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
 * Parse the axios responses and return the set of all links in those response
 * that are not currently in this[UNIQUE_LINKS]
 *
 * @param {AxiosResponse[]} linkedContent
 * @returns {Set<string>}
 *
 * @private
 * @memberof AxeCrawler
 */
function batchParseLinks(linkedContent) {
  const { domain } = this[OPTIONS];
  return linkedContent
    .filter(content => !(content instanceof Error))
    .map(newPage => this[QUEUE_LINKS](domain, newPage))
    .reduce(combineLinkSets, new Set())
    .difference(this[UNIQUE_LINKS]);
}

/**
 * Perform axios.get on each element in an array of links and
 * return an array of the resulting responses
 *
 * @param {string[]} links
 * @returns {object[]} pageContents
 *
 * @private
 * @memberof AxeCrawler
 */
async function batchGetContent(links) {
  const { logger } = this[OPTIONS];
  const content = [];
  await [...links]
    .reduce(
      (promise, url, i) => promise
        .then(() => {
          logger.debug(`Fetching #${i + 1}: ${url}`);
          return axios.get(url).catch(err => err)
            .then(result => content.push(result));
        }),
      Promise.resolve([]),
    );
  return content;
}

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

