/**
 * Mock for minimist module to return uniform set of mocked
 * command line args for testing purposes.  Uses process.mockArgs
 * to determined mock command line args
 *
 * @returns
 */
export default () => {
  const opts = {
    _: ['testdomain.dev'],
  };
  return Object.assign(opts, process.mockArgs);
};
