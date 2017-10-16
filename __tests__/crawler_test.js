/* global describe it expect beforeEach afterEach */
import moxios from 'moxios';
import axios from 'axios';
import fs from 'fs';

import polyfills from '../src/polyfills';
import crawl, { combineLinkSets, queueLinks } from '../src/crawler';

polyfills();

describe('axe-crawler/src/crawler.js', () => {
  beforeEach(() => {
    moxios.install();
  });

  afterEach(() => {
    moxios.uninstall();
  });

  describe('crawl', () => {
    it('should crawl through weblinks and return a set of all visited links', async (done) => {
      moxios.stubRequest('http://test.test', {
        status: 200,
        responseText: fs.readFileSync('__tests__/html/page1.html'),
      });

      moxios.stubRequest('http://test.test/page2.html', {
        status: 200,
        responseText: fs.readFileSync('__tests__/html/page2.html'),
      });

      moxios.stubRequest('http://test.test/page3.html', {
        status: 200,
        responseText: fs.readFileSync('__tests__/html/page3.html'),
      });

      const result = await crawl('test.test', 5);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      done();
    });

    it('should only crawl to specified depth', async (done) => {
      moxios.stubRequest('http://test.test', {
        status: 200,
        responseText: fs.readFileSync('__tests__/html/page1.html'),
      });

      moxios.stubRequest('http://test.test/page2.html', {
        status: 200,
        responseText: fs.readFileSync('__tests__/html/page2.html'),
      });

      moxios.stubRequest('http://test.test/page3.html', {
        status: 200,
        responseText: fs.readFileSync('__tests__/html/page3.html'),
      });

      const result = await crawl('test.test', 1);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(2);
      done();
    });

    it('should immediately return domain url if given depth 0', async (done) => {
      moxios.stubRequest('test.test', {
        status: 500,
        reponseText: 'No requests should be made',
      });

      const result = await crawl('test.test', 0);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(1);
      done();
    });

    it('should thrown an error if supplied domain doesn\'t result in valid url', async (done) => {
      try {
        await crawl('http://test/test');
        done(Error('crawl did not throw an error'));
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        done();
      }
    });
  });

  describe('queueLinks', () => {
    it('should parse page content and append new links to existing queue', (done) => {
      moxios.stubRequest('test.test', {
        status: 200,
        responseText: '<a href="test.test"></a><a href="/google/relative"></a><a href="/google/relative"></a>',
      });

      axios.get('test.test').then((mainPage) => {
        const links = queueLinks('test.test', mainPage);
        try {
          expect(links).toBeInstanceOf(Set);
          expect(links.size).toBe(2);
          expect(links).toContain('test.test');
          expect(links).toContain('http://test.test/google/relative');
          done();
        } catch (err) {
          done(err);
        }
      });
    });
  });

  describe('combineLinkSets', () => {
    it('should reduce an array of sets to a single set', () => {
      const arrayOfSets = [
        new Set([1, 2, 3]),
        new Set([2, 3, 4]),
        new Set([3, 4, 5]),
      ];

      const combinedSet = arrayOfSets.reduce(combineLinkSets, new Set([]));

      expect(combinedSet).toEqual(new Set([1, 2, 3, 4, 5]));
    });
  });
});
