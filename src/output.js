/**
 * @fileOverview Generate output reports from axe-crawler data
 * @name output.js
 * @author Tyler Collins
 * @license MIT
 */

const fs = require('fs');
const marked = require('marked');
const escape = require('escape-html');

export function outputToJSON(file, reports) {
    let formattedJSON = JSON.stringify(reports, null, 2);
    fs.writeFile(file, formattedJSON);
}

/**
 * buildHTMLReports - function to generate html version of JSON report
 * 
 * @param {object} reports
 */
export function outputToHTML(file, reports) {
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

    console.log(reports);

    function countViolations(report) {
        return Object.entries(report.violations).reduce((sum, [viewName, result]) => {
            console.log(viewName, result);
            return sum + result.length;
        }, 0);
    }

    function countPasses(report) {
        return Object.entries(report.passes).reduce((sum, [viewName, result]) => {
            return sum + result.length;
        }, 0);

    }

    function printViewCounts(body, report, reportType) {
        body += '<ul>';
        Object.entries(report[reportType]).forEach(([view, results]) => {
            body += '<li style="list-style: none; height: 15px;"><div class="col-xs-2">' + view + ':</div><div class="col-xs-10"> ' + results.length + ' ' + reportType + '</div></li>';
        });
        return body += '</ul>';
    }


    try {
        body += marked('## Summary of Violations: ' +
            Object.entries(reports).reduce((total, [url, report]) => {
                return total + countViolations(report);
            }, 0) + ' total violations') + '</div></div>';
    } catch (err) {
        console.log('Error:', err);
        body += marked('## Summary of Violations');
    }
    body += '<div class="row"><div class="col-xs-12">';
    Object.entries(reports).forEach(([url, report]) => {
        let violationCount = countViolations(report);

        body += marked('### ' + escape(url) + ' ' + violationCount + ' violations');

        body = printViewCounts(body, report, 'violations');

        if (violationCount !== 0) {
            let list = '<ol>';
            Object.entries(report.violations).forEach(([view, violations]) => {
                violations.forEach(({
                    impact,
                    description,
                    nodes
                }) => {
                    list += '<li>' + impact.toUpperCase() + ': ' + escape(description) + '<br />';
                    list += '';

                    list += '<span>' + view.toUpperCase() + ' Affected Nodes: </span><ul>';
                    list += nodes.reduce(writeNodeMessages, '');
                    list += '</ul></li>';
                });
            });
            body += list + '</ol>';
        }
    });



    try {
        body += marked('## Summary of Passing Tests: ' +
            Object.entries(reports).reduce((total, [url, report]) => {
                return total + countPasses(report);
            }, 0) + ' total passing tests') + '</div></div>';
    } catch (err) {
        console.log('Error:', err);
        body += marked('## Summary of Passing Tests');
    }

    Object.entries(reports).forEach(([url, report]) => {
        console.log(report);
        let passesCount = countPasses(report);

        body += marked('### ' + escape(url) + ' ' + passesCount + ' passes');

        body = printViewCounts(body, report, 'passes');

        if (passesCount !== 0) {
            Object.entries(report.passes).forEach(([view, passes]) => {
                let list = '<br/><ol><br/>';
                passes.forEach(({
                    description,
                    nodes
                }) => {
                    list += '<li>' + escape(description) + '<br />';
                    list += '<span>' + view.toUpperCase() + ' Affected Nodes: <span><ul>';
                    list += nodes.reduce(writeNodeMessages, '');;
                    list += '</ul></li>';
                });
                body += list + '</ol>';
            });
        }
    });
    body += '</div></div>';

    let foot = '<div></body><script></script></html>';

    fs.writeFile(file, head + body + foot);
}

function writeNodeMessages(list, {
    html,
    any,
    all,
    none
}) {
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
    return list;
}