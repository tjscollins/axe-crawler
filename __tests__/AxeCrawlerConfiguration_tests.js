import fs from 'fs';
import sinon from 'sinon';
import proxyquire from 'proxyquire';

import polyfills from '../src/polyfills';
import AxeCrawlerConfiguration from '../src/AxeCrawlerConfiguration';
import DB from '../src/db';

polyfills();

describe('AxeCrawlerConfiguration', () => {
  describe('new AxeCrawlerConfiguration()', () => {
    it('should use DEFAULT_OPTS in the absence of command line, JSON, or passed-parameter values for options', () => {
      const fsStub = sinon.stub(fs, 'readFileSync').returns('{}');

      const config = new AxeCrawlerConfiguration({});

      expect(config.domain).toBe('testdomain.dev');
      expect(config.depth).toBe(5);
      expect(config.check).toBe(undefined);
      expect(config.output).toBe('reports');
      expect(config.ignore).toBe('^$');
      expect(config.whitelist).toBe('.*');
      expect(config.random).toBe(1);

      fsStub.restore();
    });

    it('should read opts from JSON config file and apply them over the DEFAULT_OPTS', () => {
      const config = new AxeCrawlerConfiguration({});

      expect(config.domain).toBe('testdomain.dev');
      expect(config.ignore).toBe(false);
      expect(config.whitelist).toBe(false);
    });

    it('should parse commandline options and apply them over DEFAULT_OPTS and JSON options', () => {
      process.mockArgs = {
        random: 0.5,
        viewPorts: 'test:100x100',
      };

      const config = new AxeCrawlerConfiguration();

      expect(config.random).toBe(process.mockArgs.random);
      expect(config.viewPorts).toEqual([{ name: 'test', width: '100', height: '100' }]);
    });

    it('should accept an optional options parameter and apply its values over all others', () => {
      process.mockArgs = {
        random: 0.5,
        viewPorts: 'test:100x100',
      };

      const config = new AxeCrawlerConfiguration({ random: 0.1 });

      expect(config.random).toBe(0.1);
      expect(config.viewPorts).toEqual([{ name: 'test', width: '100', height: '100' }]);
    });
  });

  describe('AxeCrawlerConfiguration.prototype.setNumberToCheck', () => {
    it('should accept a Set<string> and return the smaller of this.check or Set.size', () => {
      const check = 5;
      const config = new AxeCrawlerConfiguration({ check });

      const set = new Set(['a', 'b']);

      config.setNumberToCheck(set);
      expect(config.numToCheck).toBe(set.size);

      set.add('c');
      set.add('d');
      set.add('e');
      set.add('f');
      set.add('g');
      set.add('h');

      config.setNumberToCheck(set);
      expect(config.numToCheck).toBe(check);
    });
  });

  describe('AxeCrawlerConfiguration.prototype.configureDB', () => {
    it('should initialize a connection to a SQLite Database', () => {
      const dbStub = sinon.stub(DB.prototype, 'initialize');

      const config = new AxeCrawlerConfiguration();

      config.configureDB();

      expect(dbStub.calledOnce).toBe(true);
      expect(config.db).toBeDefined();
      expect(config.db).toBeInstanceOf(DB);
      dbStub.restore();
    });
  });
});
