/**
 * @fileOverview Polyfills for axe-crawler
 * @name polyfills.js
 * @author Tyler Collins
 * @license MIT
 */

/**
 * polyfills - apply polyfills for needed functionality
 *
 */
export default function polyfills() {
  /* eslint-disable no-extend-native */

  const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
  const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
  const concat = Function.bind.call(Function.call, Array.prototype.concat);
  const keys = Reflect.ownKeys;

  Set.prototype.difference = function difference(setB) {
    const diff = new Set(this);
    for (const elem of setB) {
      diff.delete(elem);
    }
    return diff;
  };

  if (!Object.entries) {
    Object.entries = function entries(O) {
      return reduce(keys(O), (e, k) => concat(e, typeof k === 'string' && isEnumerable(O, k) ? [
        [k, O[k]],
      ] : []), []);
    };
  }

  if (!Array.prototype.last) {
    Array.prototype.last = function last() {
      return this[this.length - 1];
    };
  }
}
