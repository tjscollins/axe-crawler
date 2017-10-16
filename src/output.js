/**
 * @fileOverview Generate output reports from axe-crawler data
 * @name output.js
 * @author Tyler Collins
 * @license MIT
 */

import fs from 'fs';
import marked from 'marked';
import escape from 'escape-html';

import logger from './logger';

export function outputToJSON(file, reports, opts) {
  const fullReport = {
    date: new Date().toString(),
    title: `aXe Accessibility Engine Results for ${opts.domains.last()}`,
    reports,
  };
  const formattedJSON = JSON.stringify(fullReport, null, 2);
  fs.writeFile(file, formattedJSON);
}

function countResults(report, type) {
  return Object.entries(report[type]).reduce((sum, [viewName, result]) => sum + result.length, 0);
}

function printViewCounts(body, report, reportType) {
  /* eslint-disable no-param-reassign */
  body += '<ul>';
  Object.entries(report[reportType]).forEach(([view, results]) => {
    body += `<li style="list-style: none; height: 15px;"><div class="col-xs-2">${view}:</div><div class="col-xs-10"> ${results.length} ${reportType}</div></li>`;
  });
  body += '</ul>';
  return body;
  /* eslint-enable no-param-reassign */
}

function summaryTable(reports, opts) {
  let table = marked('## Summary of Overall Test Results');
  table += '<table class="summary-table"><thead><tr><th scope="col">URL</th><th scope="col">Failing Tests</th><th scope="col">Passing Tests</th></thead><tbody>';
  Object.entries(reports).forEach(([url, report]) => {
    table += `<tr><th scope="row">${url}</th>`;
    const violationList = new Set();
    Object.entries(report.violations).forEach(([view, tests]) => {
      tests.forEach(({ description }) => {
        violationList.add(`* ${escape(description)}\n`);
      });
    });
    const markedViolations = violationList.size > 0 ? marked([...violationList].reduce((list, item) => list + item, '')) : 'No violations detected by axe-core';
    table += `<td>${markedViolations}</td>`;

    const passList = new Set();
    Object.entries(report.passes).forEach(([view, tests]) => {
      tests.forEach(({ description }) => {
        passList.add(`* ${escape(description)}\n`);
      });
    });
    const markedPasses = violationList.size > 0 ? marked([...passList].reduce((list, item) => list + item, '')) : 'No passing tests detected by axe-core';
    table += `<td>${markedPasses}</td></tr>`;
  });

  table += Object.entries(reports).reduce((tbl, [url, report]) => ' ', reports, '');
  table += '</tbody></table>';
  return table;
}

/**
 * buildHTMLReports - function to generate html version of JSON report
 *
 * @param {object} reports
 */
export function outputToHTML(file, reports, opts) {
  const titleString = `aXe Accessibility Engine Report for ${opts.domains.last()}  \n${new Date().toString()}`;


  let head = '<!doctype html> <html lang="en"><head>';
  head += `<title>${titleString}</title>`;
  head += '<meta name="viewport" content="width=device-width, initial-scale=1">';
  head += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/2.8.0/github-markdown.css">';
  head += '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">';
  head += '<style> h1 { text-align: center; } ol > li { padding-bottom: 15px; font-weight: 500 } ul > li { font-weight: 400; font-size: 12px; } ol > li > span { font-weight: 400; }</style>';

  let body = '</head><body><div class="container"><div class="row"><div class="col-xs-12">';
  body += marked(`# ${titleString}`);
  body += marked('This report is not a complete accessibility audit.  This report only documents those accessibility features tested by the axe-core library, and should not be considered exhaustive of the possible accessibility issues a website may have.  Use this report as a tool in a complete and comprehensive process of reviewing this site for accessibility issues.  More information regarding the features tested by the axe-core library may be found at [axe-core.org](https://axe-core.org/)');

  if (opts.random !== 1) {
    body += marked(`This report represents only a random sample of ${Math.round(opts.random * 100)}% of all webpages on this domain.`);
  }

  body += summaryTable(reports, opts);

  body += '<div class="row"><div class="col-xs-12">';

  function writeNodeMessages(list, {
    html, any, all, none,
  }) {
  /* eslint-disable no-param-reassign */
    list += `<li>${escape(html)}`;
    any.forEach(({ message }) => {
      list += `<br />${escape(message)}`;
    });
    all.forEach(({ message }) => {
      list += `<br />${escape(message)}`;
    });
    none.forEach(({ message }) => {
      list += `<br />${escape(message)}`;
    });
    list += '</li>';
    return list;
  /* eslint-enable no-param-reassign */
  }

  try {
    body += `${marked(`## Detailed List of Failing Tests: ${
      Object.entries(reports).reduce((total, [url, report]) => total + countResults(report, 'violations'), 0)} total failing tests`)}</div></div>`;
  } catch (err) {
    logger.error('Error counting failed tests: ', err);
    body += marked('## Detailed List of Failing Tests');
  }
  body += '<div class="row"><div class="col-xs-12">';

  function listTestResults([view, results]) {
    if (results.length > 0) {
      const list = `<h4>${view.toUpperCase()}</h4><br/><ol>${results.reduce((item, {
        description,
        nodes,
        impact,
      }) => {
        item += `<li>${impact ? `${impact.toUpperCase()}: ` : ''}${escape(description)}<br />`;
        item += '<span>Affected Nodes: </span><ul>';
        item += nodes.reduce(writeNodeMessages, '');
        return item += '</ul></li>';
      }, '')}`;
      body += `${list}</ol>`;
    }
  }

  Object.entries(reports).forEach(([url, report]) => {
    const violationCount = countResults(report, 'violations');
    body += marked(`### ${escape(url)} ${violationCount} violations`);
    body = printViewCounts(body, report, 'violations');
    body += '<br/>';
    Object.entries(report.violations).forEach(listTestResults, '');
  });


  try {
    body += `${marked(`## Summary of Passing Tests: ${
      Object.entries(reports).reduce((total, [url, report]) => total + countResults(report, 'passes'), 0)} total passing tests`)}</div></div>`;
  } catch (err) {
    logger.error('Error counting passed tests: ', err);
    body += marked('## Summary of Passing Tests');
  }

  Object.entries(reports).forEach(([url, report]) => {
    const passesCount = countResults(report, 'passes');
    body += marked(`### ${escape(url)} ${passesCount} passes`);
    body = printViewCounts(body, report, 'passes');
    body += '<br />';
    Object.entries(report.passes).forEach(listTestResults, '');
  });

  body += '</div></div>';

  const foot = '</body><script></script></html>';

  fs.writeFile(file, head + body + foot);
}
