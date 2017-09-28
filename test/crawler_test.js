const expect = require('expect');
const sinon = require('sinon');
const moxios = require('moxios');
const axios = require('axios');

import crawl, {
    queueLinks
} from '../src/crawler';

describe('axe-crawler/src/crawler.js', () => {
    beforeEach(function() {
        moxios.install();

    });

    afterEach(function() {
        moxios.uninstall();
    });

    describe('crawl', () => {

    });

    describe('queueLinks', () => {
        it('should parse page content and append new links to existing queue', async function(done) {
            moxios.stubRequest(/.*/, {
                status: 200,
                responseText: '<a href="test.test"></a><a href="/google/relative"></a><a href="/google/relative"></a>'
            });

            let domain = 'test.test';
            axios.get('test.test').then((mainPage) => {
                console.log(mainPage);
                let links = queueLinks(domain, mainPage, null);
                try {
                    expect(links).toBeA(Set);
                } catch (err) {
                    done(err);
                }
                done();
            });
        });
    });
});