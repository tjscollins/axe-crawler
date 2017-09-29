/**
 * @fileOverview Utility functions for axe-crawler
 * @name util.js
 * @author Tyler Collins
 * @license MIT
 */

/**
 * removeMedia -- function to filter Wordpress media urls from list of urls
 *
 * @param {string} url
 */
export function notMedia(url) {
  return !/(uploads\/\d{4}\/\d{2}\/)/.test(url) &&
        !/attachment_id/.test(url) &&
        !/\.(exe|wmv|avi|flv|mov|mkv|mp..?|swf|ra.?|rm|as.|m4[av]|smi.?|doc|docx|ppt|pptx|pps|ppsx|jpg|png|gif|pdf)$/.test(url);
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
