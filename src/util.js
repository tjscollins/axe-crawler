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
 * Returns a function to filter urls not matching domain
 *
 * @param {string} domain
 */
export function matchDomain(domain) {
  return url => new RegExp(`^https?://([\\w&&[^\\?=\\&\\.]]*\\.?)*?${domain}/?.*$`).test(url) || /^\/\w+/.test(url);
}

/**
 * Tests whether a link is NOT a mailto link
 *
 * @param {string} link
 * @returns boolean
 */
function notEmailLink(link) {
  const mailLinkRE = new RegExp('mailto:\\w+');
  return !mailLinkRE.test(link);
}

/**
 * Tests whether a link is NOT a same page link
 *
 * @param {string} link
 * @returns boolean
 */
function notSamePageLink(link) {
  const samePageLinkRE = new RegExp('https?://.*#[^/]*$');
  return !samePageLinkRE.test(link);
}

/**
 * Generates  and returns a function to be passed to
 * Array.prototype.filter to filter an Array<string> of links.
 *
 * @param {Object} opts global options object
 * @returns {Function} To be passed to Array.prototype.filter
 */
export function filterLinks(opts) {
  const { domain, ignore, whitelist } = opts;
  const ignoreRegex = new RegExp(ignore || '^$');
  const whiteListRegex = new RegExp(whitelist || '.*');

  return link =>
    isURL(link) &&
    notMedia(link) &&
    notEmailLink(link) &&
    matchDomain(domain)(link) &&
    // notSamePageLink(domain)(link) && // Buggy for SPA routing, disabled
    whiteListRegex.test(link) &&
    (whitelist ? true : !ignoreRegex.test(link)); // whitelist overrides ignore
}

export function isNatural(num) {
  if (num < 0) return false;
  return Number.isInteger(num);
}

/**
 * Generates a callback function for used to reduce list of urls into
 * list of {url, viewPort} combinations
 *
 * @param {Object} globalOptions
 * @returns {Function} callback function for reduce
 */
export function createURLViewSet(opts) {
  return (links, url) => {
    opts.viewPorts.forEach((viewPort) => {
      links.push({ url, viewPort });
    });
    return links;
  };
}
