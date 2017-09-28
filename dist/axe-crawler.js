#!/usr/bin/env node
'use strict';

/**
 * main - main function to start scraping the website, build the queue of individual pages
 *        and run axe tests on each page
 * 
 * @param {string} url homepage of website to be scraped and tested.
 */
let main = (() => {
    var _ref = _asyncToGenerator(function* (domain, opts) {
        // Validate url and throw error if invalid
        let url = 'http://' + domain;
        if (!isURL(url)) {
            throw new Error('Invalid url: ' + url);
        }

        // Scrape main url
        const mainPage = yield axios.get(url);

        // Create Queue of links on main page
        console.log('Crawling website to depth of: ', DEPTH);
        const linkQueue = yield buildLinkQueue(domain, mainPage, DEPTH, VIEWPORTS);
        console.log('Found ' + linkQueue.size + ' links within ' + domain);
        console.log('Total urls to test:', FIRST_LINKS || linkQueue.size);
        // Test each link
        Promise.all([...linkQueue].reduce(function (links, url) {
            VIEWPORTS.forEach(function (view) {
                links.push({
                    url,
                    view
                });
            });
            return links;
        }, []).slice(0, FIRST_LINKS).map(testPage)).then(function (results) {
            console.log('Creating reports: ', OUTPUT + '.json', OUTPUT + '.html');
            let reports = {
                violations: {},
                passes: {},
                incompletes: {}
            };
            results.forEach(function ({
                result,
                view
            }) {
                try {
                    reports.violations[result.url] = {};
                    reports.violations[result.url][view.name] = result.violations;
                    reports.passes[result.url][view.name] = result.passes;
                    reports.incompletes[result.url][view.name] = result.incompletes;
                } catch (err) {
                    console.log(err);
                }
            });
            let completeReport = JSON.stringify(reports, null, 2);
            fs.writeFile(OUTPUT + '.json', completeReport);
            fs.writeFile(OUTPUT + '.html', buildHTMLReport(reports));
        });
    });

    return function main(_x, _x2) {
        return _ref.apply(this, arguments);
    };
})();

/**
 * buildLinkQueue - Crawls through page links and builds a set of all pages to test.  Goes 5 levels deep
 *                  through links checking for new pages by default
 * 
 * @param {object} pageContent Promise returned by axios.get
 * @param {int} depth Levels to recurse through website to find new links.
 */


let buildLinkQueue = (() => {
    var _ref2 = _asyncToGenerator(function* (domain, pageContent, depth = 5) {
        let allLinks = yield queueLinks(domain, pageContent, null);
        let links = new Set([...allLinks]);

        for (let i = 1; i < depth; i++) {
            if (links.size == 0) {
                i = depth;
            }
            let newLinks = yield Promise.all([...links].map((() => {
                var _ref3 = _asyncToGenerator(function* (url) {
                    let newPage = yield axios.get(url);
                    return queueLinks(domain, newPage, null);
                });

                return function (_x5) {
                    return _ref3.apply(this, arguments);
                };
            })()));

            let newLinkSet = newLinks.reduce(function (urlList, urlSet) {
                if (urlList instanceof Set) {
                    for (let url of urlList) {
                        urlSet.add(url);
                    }
                    return urlSet;
                } else {
                    return urlSet;
                }
            }, new Set([]));
            links = newLinkSet.difference(allLinks);
            for (let url of newLinkSet) {
                allLinks.add(url);
            }
        }
        return allLinks;
    });

    return function buildLinkQueue(_x3, _x4) {
        return _ref2.apply(this, arguments);
    };
})();

/**
 * queueLinks - parses page content and appends all links on the page to existing queue.
 * 
 * @param {object} pageContent html string holding the content of the page to be parsed 
 * @param {set} existingQueue a set of existing links that new links will be added to.  Queue should be a set.
 */


/**
 * testPage - runs axe-core tests on a page at the supplied url.  Returns the results of that test.
 * 
 * @param {string} url address of the page to be tested with axe-core
 */
let testPage = (() => {
    var _ref4 = _asyncToGenerator(function* ({
        url,
        view
    }) {
        const options = new chromeDriver.Options();
        options.addArguments('headless', 'disable-gpu', '--window-size=' + view.width + ',' + view.height);
        let driver = new webDriver.Builder().forBrowser('chrome').setChromeOptions(options).build();
        let outputReport = null;
        yield driver.get(url).then(function () {
            console.log('Testing: ', url, view.name);
            axeBuilder(driver).analyze(function (results) {
                outputReport = results;
            });
        }).then(function () {
            return driver.close();
        });
        return {
            result: outputReport,
            view
        };
    });

    return function testPage(_x6) {
        return _ref4.apply(this, arguments);
    };
})();

/**
 * removeMedia -- function to filter Wordpress media urls from list of urls
 * 
 * @param {string} url
 */


function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const axe = require('axe-core');
const axeBuilder = require('axe-webdriverjs');
const axios = require('axios');
const cheerio = require('cheerio');
const chromeDriver = require('selenium-webdriver/chrome');
const escape = require('escape-html');
const fs = require('fs');
const marked = require('marked');
const minimist = require('minimist');
const webDriver = require('selenium-webdriver');
const {
    isURL
} = require('validator');

polyfills();

const argv = minimist(process.argv.slice(2));
const DEPTH = argv.d || 5;
const FIRST_LINKS = argv.n || undefined;
const OUTPUT = argv.o || 'reports';

const VIEWPORTS = [{
    name: "mobile",
    width: 360,
    height: 640
}, {
    name: "tablet_vertical",
    width: 768,
    height: 1024
}, {
    name: "tablet_horizontal",
    width: 1024,
    height: 768
}, {
    name: "desktop",
    width: 1440,
    height: 900
}];

if (argv._.length < 1) {
    console.log('No domains supplied.  Exiting...');
}

argv._.forEach(domain => {
    console.log('Generating report for: ', domain);
    main(domain);
});function queueLinks(domain, pageContent, existingQueue) {
    if (pageContent.status == 200) {
        let links = cheerio.load(pageContent.data)("a");
        return new Set(Object.keys(links).map(n => {
            if (links[n].attribs) {
                return links[n].attribs.href;
            }
            return null;
        }).filter(url => typeof url === 'string').filter(url => isURL(url)).map(url => url.replace(/^https/, 'http')).filter(removeMedia).filter(matchDomain(domain)));
    } else {
        throw new Error('Website returned an error: ' + pageContent.status);
    }
}function removeMedia(url) {
    return !/(uploads\/\d{4}\/\d{2}\/)/.test(url) && !/attachment_id/.test(url) && !/\.(wmv|avi|flv|mov|mkv|mp..?|swf|ra.?|rm|as.|m4[av]|smi.?|doc|docx|ppt|pptx|pps|ppsx|jpg|png|gif|pdf)$/.test(url);
}

/**
 * matchDomain - returns a function to filter urls not matching domain
 * 
 * @param {string} domain
 */
function matchDomain(domain) {
    return url => {
        return new RegExp(domain).test(url) || /^\/\w+/.test(url);
    };
}

/**
 * buildHTMLReports - function to generate html version of JSON report
 * 
 * @param {object} reports
 */
function buildHTMLReport(reports) {
    let head = '<!doctype html> <html lang="en"><head>';
    head += '<title>aXe Accessibility Engine Report' + new Date().toDateString() + '</title>';
    head += '<meta name="viewport" content="width=device-width, initial-scale=1">';
    head += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/2.8.0/github-markdown.css">';
    head += '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">';
    head += '<style> h1 { text-align: center; } ol > li { padding-bottom: 15px; font-weight: 500 } ul > li { font-weight: 400; font-size: 12px; } ol > li > span { font-weight: 400; }</style>';

    let body = '</head><body><div class="container"><div class="row"><div class="col-xs-12">';
    body += marked('# aXe Accessibility Engine Report ' + new Date().toDateString());
    body += marked('This report should is not a complete accessibility audit.  This report only documents those accessibility features tested by the axe-core library, and should not be considered exhaustive of the possible accessibility issues a website may have.  More information regarding the features tested by the axe-core library may be found at [axe-core.org](https://axe-core.org/)') + '</div></div>';
    body += '<div class="row"><div class="col-xs-12">';

    try {
        body += marked('## Summary of Violations: ' + Object.entries(reports.violations).reduce((total, [url, violations]) => {
            return total + violations.length;
        }, 0) + ' total violations') + '</div></div>';
    } catch (err) {
        console.log('Error:', err);
        body += marked('## Summary of Violations');
    }
    body += '<div class="row"><div class="col-xs-12">';
    Object.entries(reports.violations).forEach(([url, violations]) => {
        let violationCount = violations.length;

        body += marked('### ' + escape(url) + ' ' + violationCount + ' violations');
        if (violationCount !== 0) {
            let list = '<ol>';
            Object.entries(violations).forEach(([view, {
                impact,
                nodes,
                description,
                id
            }]) => {
                list += '<li>' + impact.toUpperCase() + ': ' + escape(description) + '<br />';
                list += '';
                list += '<span>Affected Nodes: </span><ul>';
                nodes.forEach(({
                    html,
                    any,
                    all,
                    none
                }) => {
                    list += '<li>' + escape(html);
                    any.forEach(({
                        message
                    }) => {
                        list += '<br />' + escape(message);
                    });
                    all.forEach(({
                        message
                    }) => {
                        list += '<br />' + escape(message);
                    });
                    none.forEach(({
                        message
                    }) => {
                        list += '<br />' + escape(message);
                    });
                    list += '</li>';
                });
                list += '</ul></li>';
            });
            body += list + '</ol>';
        }
    });

    try {
        body += marked('## Summary of Passing Tests: ' + Object.entries(reports.passes).reduce((total, [url, passes]) => {
            return total + passes.length;
        }, 0) + ' total passing tests') + '</div></div>';
    } catch (err) {
        console.log('Error:', err);
        body += marked('## Summary of Passing Tests');
    }

    Object.entries(reports.passes).forEach(([url, passingTests]) => {
        body += marked('### ' + escape(url) + ' ' + passingTests.length + ' passes');
        if (passingTests.length !== 0) {
            let list = '<ol>';
            passingTests.forEach(({
                description,
                nodes
            }) => {
                list += '<li>' + escape(description) + '<br />';
                list += '<span>Affected Nodes: <span><ul>';
                nodes.forEach(({
                    html,
                    any,
                    all,
                    none
                }) => {
                    list += '<li>' + escape(html);
                    any.forEach(({
                        message
                    }) => {
                        list += '<br />' + escape(message);
                    });
                    all.forEach(({
                        message
                    }) => {
                        list += '<br />' + escape(message);
                    });
                    none.forEach(({
                        message
                    }) => {
                        list += '<br />' + escape(message);
                    });
                    list += '</li>';
                });
                list += '</ul></li>';
            });
            body += list + '</ol>';
        }
    });
    body += '</div></div>';

    let foot = '<div></body><script></script></html>';

    return head + body + foot;
}

/**
 * polyfills - apply polyfills for needed functionality
 * 
 */
function polyfills() {
    let reduce = Function.bind.call(Function.call, Array.prototype.reduce);
    let isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
    let concat = Function.bind.call(Function.call, Array.prototype.concat);
    let keys = Reflect.ownKeys;

    Set.prototype.difference = function (setB) {
        var difference = new Set(this);
        for (var elem of setB) {
            difference.delete(elem);
        }
        return difference;
    };

    if (!Object.values) {
        Object.values = function values(O) {
            return reduce(keys(O), (v, k) => concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []), []);
        };
    }

    if (!Object.entries) {
        Object.entries = function entries(O) {
            return reduce(keys(O), (e, k) => concat(e, typeof k === 'string' && isEnumerable(O, k) ? [[k, O[k]]] : []), []);
        };
    }
}

