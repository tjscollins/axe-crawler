import Logger from '../src/logger';

const log = jest.spyOn(console, 'log').mockImplementation(() => null);
const error = jest.spyOn(console, 'error').mockImplementation(() => null);

beforeEach(() => {
  log.mockClear();
  error.mockClear();
});

describe('logger.debug', () => {
  it('should not log if logger.verbose < debug', () => {
    const logger = new Logger('info');
    logger.debug('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);

    process.verbose = 'error';
    logger.debug('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);

    process.verbose = false;
    logger.debug('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);
  });

  it('should log if logger.verbose == debug', () => {
    const logger = new Logger('debug');
    logger.debug('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(1);
  });
});

describe('logger.info', () => {
  it('should not log if logger.verbose < info', () => {
    const logger = new Logger('error');
    logger.info('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);

    process.verbose = false;
    logger.info('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(0);
  });

  it('should log if logger.verbose >= info', () => {
    let logger = new Logger('debug');
    logger.info('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(1);

    logger = new Logger('info');
    logger.info('TESTING MESSAGE');
    expect(log.mock.calls.length).toBe(2);
  });
});

describe('logger.error', () => {
  it('should not log if logger.verbose < error', () => {
    const logger = new Logger('quiet');
    logger.error('TESTING MESSAGE');
    expect(error.mock.calls.length).toBe(0);
  });

  it('should log if logger.verbose >= error', () => {
    let logger = new Logger('debug');
    logger.error('TESTING MESSAGE');
    expect(error.mock.calls.length).toBe(1);

    logger = new Logger('info');
    logger.error('TESTING MESSAGE');
    expect(error.mock.calls.length).toBe(2);

    logger = new Logger('error');
    logger.error('TESTING MESSAGE');
    expect(error.mock.calls.length).toBe(3);
  });
});
