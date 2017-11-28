import fs from 'fs';
import moxios from 'moxios';
import sinon from 'sinon';

import axios from 'axios';
import polyfills from '../src/polyfills';
import AxeCrawler from '../src/AxeCrawler';
import AxeCrawlerConfiguration from '../src/AxeCrawlerConfiguration';

polyfills();

describe('AxeCrawler', () => {
  beforeEach(() => {
    moxios.install();
  });

  afterEach(() => {
    moxios.uninstall();
  });

  describe('new AxeCrawler()', () => {
    it('should return an instance of AxeCrawler', () => {
      const crawler = new AxeCrawler({});
      expect(crawler).toBeInstanceOf(AxeCrawler);
    });
  });

  describe('AxeCrawler.prototype.crawl', () => {
    it('should crawl through a website and return a set of unique links visited', () => {
      const page1Content = fs.readFileSync('./__tests__/html/page1.html');
      const page2Content = fs.readFileSync('./__tests__/html/page2.html');
      const page3Content = fs.readFileSync('./__tests__/html/page3.html');
      moxios.stubRequest('http://test.test', {
        status: 200,
        responseText: page1Content,
        config: { url: 'http://test.test' },
      });
      moxios.stubRequest('http://test.test/page2.html', {
        status: 200,
        responseText: page2Content,
        config: { url: 'http://test.test/page2.html' },
      });
      moxios.stubRequest('http://test.test/page3.html', {
        status: 200,
        responseText: page3Content,
        config: { url: 'http://test.test/page3.html' },
      });

      const expectedSet = new Set(['http://test.test', 'http://test.test/page2.html', 'http://test.test/page3.html']);

      const config = new AxeCrawlerConfiguration({ domain: 'test.test' });
      const crawler = new AxeCrawler(config);

      return crawler.crawl().then((returnedSet) => {
        expect(returnedSet).toEqual(expectedSet);
      });
    });

    it('should only crawl to specified depth', () => {
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

      const config = new AxeCrawlerConfiguration({ domain: 'test.test', depth: 1 });
      const crawler = new AxeCrawler(config);

      return crawler.crawl().then((result) => {
        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(2);
        expect(result.has('http://test.test/page3.html')).toBe(false);
      });
    });

    it('should immediately return domain url if given depth 0', () => {
      const axiosStub = sinon.stub(axios, 'get').throws('Should not be called');

      const config = new AxeCrawlerConfiguration({ domain: 'test.test', depth: 0 });
      const crawler = new AxeCrawler(config);

      return crawler.crawl().then((result) => {
        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(1);
        expect(axiosStub.called).toBe(false);
        axiosStub.restore();
      });
    });

    it('should throw an error if supplied domain doesn\'t result in valid url', (done) => {
      const config = new AxeCrawlerConfiguration({ domain: 'test/test', depth: 0 });
      const crawler = new AxeCrawler(config);
      return crawler.crawl().then(() => {
        done(new Error('crawl did not throw an error'));
      }).catch((err) => {
        expect(err).toBeInstanceOf(Error);
        done();
      });
    });

    it('should call process.exit(1) if it encounters any unrecoverable errors crawling links', () => {
      const axiosStub = sinon.stub(axios, 'get').throws('Expected Error');
      const consoleStub = sinon.stub(console, 'error');
      const exitStub = sinon.stub(process, 'exit');

      const config = new AxeCrawlerConfiguration({ domain: 'test.test' });
      const crawler = new AxeCrawler(config);

      return crawler.crawl().then(() => {
        expect(exitStub.calledOnce).toBe(true);
        expect(exitStub.calledWithExactly(1)).toBe(true);
        axiosStub.restore();
        consoleStub.restore();
        exitStub.restore();
      });
    });
  });
});
