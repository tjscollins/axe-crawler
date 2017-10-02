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
  const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
  const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
  const concat = Function.bind.call(Function.call, Array.prototype.concat);
  const keys = Reflect.ownKeys;

  Set.prototype.difference = function (setB) {
    const difference = new Set(this);
    for (const elem of setB) {
      difference.delete(elem);
    }
    return difference;
  };

  if (!Object.values) {
    Object.values = function values(O) {
      return reduce(keys(O), (v, k) => concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []), []);
    };
  }

  if (!Object.entries) {
    Object.entries = function entries(O) {
      return reduce(keys(O), (e, k) => concat(e, typeof k === 'string' && isEnumerable(O, k) ? [
        [k, O[k]],
      ] : []), []);
    };
  }
}
