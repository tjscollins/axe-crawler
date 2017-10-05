/**
 * @fileOverview Utility functions for axe-crawler
 * @name util.js
 * @author Tyler Collins
 * @license MIT
 */
import { isURL } from 'validator';

/**
 * if opts.random is set, create filter fn to filter urls to create
 * randomized sample of total url queue
 *
 * @param {Object} opts
 * @returns {Function}
 */
export function selectSampleSet(opts) {
  return (urlList, url) => {
    if (!opts.random) {
      urlList.push(url);
      return urlList;
    }

    if (Math.random() < opts.random) {
      urlList.push(url);
      return urlList;
    }

    return urlList;
  };
}

/**
 * notMedia - function to filter Wordpress media urls from list of urls
 *
 * @param {string} url
 */
export function notMedia(url) {
  return !/(uploads\/\d{4}\/\d{2}\/)/.test(url) &&
        !/attachment_id/.test(url) &&
        !/\.(exe|wmv|avi|flv|mov|mkv|mp..?|swf|ra.?|rm|as.|m4[av]|smi.?|doc|docx|ppt|pptx|pps|ppsx|jpg|png|gif|pdf)$/.test(url);
}

/**
 * isDoc - function to filter out non documents and leave only document links
 *
 * @export
 * @param {any} url
 * @returns
 */
export function isDoc(url) {
  return /(uploads\/\d{4}\/\d{2}\/)/.test(url) &&
  /\.(doc|docx|ppt|pptx|pps|ppsx|pdf|xls|xlsx)$/.test(url);
}

/**
 * matchDomain - returns a function to filter urls not matching domain
 *
 * @param {string} domain
 */
export function matchDomain(domain) {
  return url => new RegExp(domain).test(url) ||
            /^\/\w+/.test(url);
}

/**
 * Generates  and returns a function to be passed to
 * Array.prototype.filter to filter an Array<string> of links.
 *
 * @param {Object} opts global options object
 * @returns {Function} To be passed to Array.prototype.filter
 */
export function filterLinks(opts) {
  const ignoreRegex = new RegExp(opts.ignore || '^$');
  const whiteListRegex = new RegExp(opts.whitelist || '.*');

  return link => isURL(link) &&
    notMedia(link) &&
    matchDomain(opts.domains.last())(link) &&
    whiteListRegex.test(link) &&
    (opts.whitelist ? true : !ignoreRegex.test(link)); // whitelist overrides ignore
}
