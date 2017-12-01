import sinon from 'sinon';

import polyfills from '../src/polyfills';
import TestRunner from '../src/TestRunner';
import AxeCrawlerConfiguration from '../src/AxeCrawlerConfiguration';
import JSONReporter from '../src/reporters/JSONReporter';
import HTMLReporter from '../src/reporters/HtmlReporter';

polyfills();

describe.only('TestRunner', () => {
  describe('new TestRunner()', () => {});

  describe('TestRunner.protoype.queue', () => {
    it('should convert a Set<string> to an array of objects holding url + viewPort combinations and store the array as a private variable', () => {
      const queue = new Set(['a', 'b', 'c', 'd', 'e']);

      const config = new AxeCrawlerConfiguration();
      const runner = new TestRunner(config);

      runner.queue(queue);

      const QUEUE_SYM = Object.getOwnPropertySymbols(runner).last();

      expect(runner[QUEUE_SYM].length).toBe(5 * config.viewPorts.length);
      runner[QUEUE_SYM].forEach((view) => {
        expect(queue.has(view.url)).toBe(true);
        expect(view.viewPort).toBeDefined();
      });
    });
  });

  describe('TestRunner.prototype.run', () => {
    it('should return a promise', () => {
      const queue = new Set(['a', 'b', 'c', 'd', 'e']);

      const config = new AxeCrawlerConfiguration();
      const runner = new TestRunner(config);

      const TEST_PAGE = Object.getOwnPropertySymbols(runner)[1];

      const testStub = sinon.stub(runner, TEST_PAGE);

      runner.queue(queue);

      expect(runner.run()).toBeInstanceOf(Promise);
      testStub.restore();
    });

    it('should call [TEST_PAGE] on every element in its queue', () => {
      const queue = new Set(['a', 'b', 'c', 'd', 'e']);

      const config = new AxeCrawlerConfiguration();
      const runner = new TestRunner(config);

      const TEST_PAGE = Object.getOwnPropertySymbols(runner)[1];
      runner.queue(queue);

      const QUEUE = Object.getOwnPropertySymbols(runner).last();
      const testStub = sinon.stub(runner, TEST_PAGE);

      return runner.run().then(() => {
        expect(testStub.callCount).toBe(runner[QUEUE].length);
        testStub.restore();
      });
    });
  });

  describe('TestRunner.prototype.report', () => {
    it('should write a JSON report and an HTML Report', () => {
      const queue = new Set(['a', 'b', 'c', 'd', 'e']);

      const config = new AxeCrawlerConfiguration();

      config.configureDB();

      const runner = new TestRunner(config);

      const TEST_PAGE = Object.getOwnPropertySymbols(runner)[1];

      const testStub = sinon.stub(runner, TEST_PAGE);
      const dbStub = sinon.stub(config.db, 'read').returns(Promise.resolve());
      const jsonStub = sinon.stub(JSONReporter.prototype, 'write');
      const htmlStub = sinon.stub(HTMLReporter.prototype, 'write');

      runner.queue(queue);
      return runner.report().then(() => {
        expect(jsonStub.calledOnce).toBe(true);
        expect(htmlStub.calledOnce).toBe(true);
      });
    });
  });
});
