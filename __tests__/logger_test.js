import logger from '../src/logger';

const log = jest.spyOn(console, 'log').mockImplementation(() => null);
const error = jest.spyOn(console, 'error').mockImplementation(() => null);

beforeEach(() => {
  log.mockClear();
  error.mockClear();
});

describe('logger.debug', () => {
  it('should not log if process.verbose < debug', () => {
    process.verbose = 'info';
    logger.debug('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);

    process.verbose = 'error';
    logger.debug('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);

    process.verbose = false;
    logger.debug('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);
  });

  it('should log if process.verbose == debug', () => {
    process.verbose = 'debug';
    logger.debug('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(1);
  });
});

describe('logger.info', () => {
  it('should not log if process.verbose < info', () => {
    process.verbose = 'error';
    logger.info('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);

    process.verbose = false;
    logger.info('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);
  });

  it('should log if process.verbose >= info', () => {
    process.verbose = 'debug';
    logger.info('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(1);

    process.verbose = 'info';
    logger.info('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(2);
  });
});

describe('logger.error', () => {
  it('should not log if process.verbose < error', () => {
    process.verbose = undefined;
    logger.error('TESTING MESSAGE');
    expect(error.mock.calls.length).toBe(0);
  });

  it('should log if process.verbose >= error', () => {
    process.verbose = 'debug';
    logger.error('TESTING MESSAGE');
    expect(error.mock.calls.length).toBe(1);

    process.verbose = 'info';
    logger.error('TESTING MESSAGE');
    expect(error.mock.calls.length).toBe(2);

    process.verbose = 'error';
    logger.error('TESTING MESSAGE');
    expect(error.mock.calls.length).toBe(3);
  });
});
