# axe-crawler

![npm 6.11.1](https://img.shields.io/badge/npm-6.11.1-blue.svg?style=flat-square) ![license MIT](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat-square)

axe-crawler is a Node.js webcrawler which tests every page it can find in a single domain using the [axe-core](https://github.com/dequelabs/axe-core) accessibility testing library.

axe-crawler produces a detailed html summary report of the accessibility issues it finds on pages in the domain in addition to raw JSON data output from the tests.  

***WARNING: Depending on the number of tests run (urls x viewPorts) the raw JSON data output can be quite large, easily in the tens of megabytes.  Use the --check, --random, and --viewPort options to control which pages are tested.***

## Installation

From npm:
```
npm install -g axe-crawler
```

## Basic Usage

axe-crawler defaults to crawling through all links it can find WITHIN the provided doman name. If you use
```
axe-crawler mydomain.org
```
then axe-crawler will parse `http://mydomain.org` for all links it finds and build a queue of unique links.  It will then visit those links and look for new links to add to its queue.  Because it uses a Javascript Set to build the queue of unique links, it will only queue each url once.

By default, axe-crawler ignores links that end in common media or document extensions (.mp3, .avi, .pdf, .docx, etc.)

When axe-crawler finishes crawling through the domain to the specified depth (default: 5), or when it stops finding new links, it then uses selenium, chrome-driver, and axe-core to open a headless Chrome browser and test each link in the queue for accessibility at each specified viewPort resolution (default: mobile, tablet_vertical, tablet_horizontal, and desktop).

Each url found will be visited a total of once + the number of viewPorts specified (default: 5 times total).  In order to avoid overloading servers the selenium driven requests are done synchronously rather than asynchronously.

***Please be considerate in your use of this or any web scraping tool.  Don't point it at other people's domains without permission.  It is recommended to use this tool on testing/staging servers rather than production servers for obvious reasons.***

## Configuration

Most parameters of axe-crawler are configurable at the command line or with a JSON config file named `.axe-crawler.json` in the current directory.

### Command Line Options

Command line arguments passed to axe-crawler override config file settings and the default options.
```
--depth d
    Specify how many levels deep you want the crawler to scrape for new links.
    Default: 5.

--check n
    Specify the maximum number of URLs you want to actually test from the queue.
    Useful for testing the crawler and seeing what links it finds without running
    the axe-core tests on every URL.  Default: undefined which checks all links
    in the queue.

--random p
    Specify the rate at which to randomly select pages from the website.  Crawler
    will first build a queue of all pages that it can find and then reduce that
    queue to the sampling rate given by this option.  p represents the probably
    any single link will be chosen. 0 < p < 1 . Default: 1 (i.e. 100%)

--viewPorts viewportString
    Specify which viewPorts to use when running accessibility tests.  Useful for
    sites where visibile markup on mobile screen sizes differs substantially from
    other screen sizes.  Format is name:WIDTHxHEIGHT,... Default: mobile:360x640,
    table_vertical:768x1024,table_horizontal:1024x768,desktop:1440x900

--ignore regex
    Specify a regular expression that identifies URLs you wish to ignore.
    Overridden by whitelist regex if both are specified.  Defaults to matching
    empty strings (i.e. /^$/) if unspecified.

--whitelist regex
    Specify a regular expression that identifies URLs that you wish to whitelist,
    completely overriding the ignore regex if specicified.  Default: false (i.e.
    no regex)

--output outputFilePrefix
    Specify the prefix for your output file names which will be
    outputFilePrefix.html for the summary report and outputFilePrefix.json for the
    raw data.  Default: 'reports'

--configFile filename
    Specify a config file different from the default .axe-crawler.json

--verbose error | info | debug
    Specify a verbosity level for console output.  Info level includes errors, debug
    includes all other logging statements.  Default: error.

--quiet
    Silence all logging output.

--dryRun
    Shortcut for '--check 0 --verbose debug' Useful for seeing what would be tested before 
    running actual tests.
```

### Config File Options

Config file should be named `.axe-crawler.json` and be in the current directory when axe-crawler is run.

```json
{
    "depth": 5,
    "check": 1000,
    "output": "reports",
    "ignore": false,
    "whitelist": false,
    "random": 1,
    "viewPorts": [
        {
            "name": "mobile",
            "width": 360,
            "height": 640
        },
        {
            "name": "tablet_vertical",
            "width": 768,
            "height": 1024
        },
        {
            "name": "tablet_horizontal",
            "width": 1024,
            "height": 768
        },
        {
            "name": "desktop",
            "width": 1440,
            "height": 900
        }
    ],
    "verbose": "error"
}
```

## Planned Features

* Better error reporting and handling esp. for bad configuration and broken links
* Oauth functionality for testing pages behind logins