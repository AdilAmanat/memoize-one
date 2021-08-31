import areInputsEqual from './are-inputs-equal';

// Using ReadonlyArray<T> rather than readonly T as it works with TS v3
export type EqualityFn = (newArgs: any[], lastArgs: any[]) => boolean;

type Cache<TResult> = {
  lastThis: unknown;
  lastArgs: unknown[];
  lastResult: TResult;
};

type MemoizedFn<T extends (this: any, ...args: any[]) => any> = {
  name: string;
  clear: () => void;
  (...args: Parameters<T>): ReturnType<T>;
};

function memoizeOne<TFunc extends (this: any, ...newArgs: any[]) => any>(
  resultFn: TFunc,
  isEqual: EqualityFn = areInputsEqual,
): MemoizedFn<TFunc> {
  const map = new Map<'cache', Cache<ReturnType<TFunc>>>();

  // breaking cache when context (this) or arguments change
  function memoized(this: unknown, ...newArgs: unknown[]): ReturnType<TFunc> {
    const cache = map.get('cache');
    if (cache && cache.lastThis === this && isEqual(newArgs, cache.lastArgs)) {
      return cache.lastResult;
    }

    // Throwing during an assignment aborts the assignment: https://codepen.io/alexreardon/pen/RYKoaz
    // Doing the lastResult assignment first so that if it throws
    // nothing will be overwritten
    const lastResult = resultFn.apply(this, newArgs);
    map.set('cache', {
      lastResult,
      lastArgs: newArgs,
      lastThis: this,
    });

    return lastResult;
  }

  // Giving the function a better name for devtools
  Object.defineProperty(memoized, 'name', {
    value: `memoized(${resultFn.name})`,
    // fn.name is configurable, so maintaining that.
    configurable: true,
    // Using the default values:
    // enumerable: false,
    // writable: false,
  });

  // Adding the ability to clear the cache of a memoized function
  memoized.clear = function clear() {
    map.delete('cache');
  };

  return memoized;
}

// default export
export default memoizeOne;
