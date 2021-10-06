# memoize-one

A memoization library that only caches the result of the most recent arguments.

> Also [async version](https://github.com/microlinkhq/async-memoize-one).

[![Build Status](https://travis-ci.org/alexreardon/memoize-one.svg?branch=master)](https://travis-ci.org/alexreardon/memoize-one)
[![npm](https://img.shields.io/npm/v/memoize-one.svg)](https://www.npmjs.com/package/memoize-one)
![types](https://img.shields.io/badge/types-typescript%20%7C%20flow-blueviolet)
[![dependencies](https://david-dm.org/alexreardon/memoize-one.svg)](https://david-dm.org/alexreardon/memoize-one)
[![minzip](https://img.shields.io/bundlephobia/minzip/memoize-one.svg)](https://www.npmjs.com/package/memoize-one)
[![Downloads per month](https://img.shields.io/npm/dm/memoize-one.svg)](https://www.npmjs.com/package/memoize-one)

## Rationale

Unlike other memoization libraries, `memoize-one` only remembers the latest arguments and result. No need to worry about cache busting mechanisms such as `maxAge`, `maxSize`, `exclusions` and so on, which can be prone to memory leaks. A function memoized with `memoize-one` simply remembers the last arguments, and if the memoized function is next called with the same arguments then it returns the previous result.

## Usage

```js
// memoize-one uses the default import
import memoizeOne from 'memoize-one';

function add (a, b) {
  return a + b;
}
const memoizedAdd = memoizeOne(add);

memoizedAdd(1, 2);
// add function: is called
// [new value returned: 3]

memoizedAdd(1, 2);
// add function: not called
// [cached result is returned: 3]

memoizedAdd(2, 3);
// add function: is called
// [new value returned: 5]

memoizedAdd(2, 3);
// add function: not called
// [cached result is returned: 5]

memoizedAdd(1, 2);
// add function: is called
// [new value returned: 3]
// 👇
// While the result of `add(1, 2)` was previously cached
// `(1, 2)` was not the *latest* arguments (the last call was `(2, 3)`)
// so the previous cached result of `(1, 3)` was lost
```

## Installation

```bash
# yarn
yarn add memoize-one

# npm
npm install memoize-one --save
```

## Function argument equality

By default, we apply our own _fast_ and _naive_ equality function to determine whether the arguments provided to your function are equal. You can see the full code here: [are-inputs-equal.ts](https://github.com/alexreardon/memoize-one/blob/master/src/are-inputs-equal.ts).

(By default) function arguments are considered equal if:

1. there is same amount of arguments
2. each new argument has strict equality (`===`) with the previous argument
3. **[special case]** if two arguments are not `===` and they are both `NaN` then the two arguments are treated as equal

What this looks like in practice:

```js
import memoizeOne from 'memoize-one';

// add all numbers provided to the function
const add = (...args = []) =>
  args.reduce((current, value) => {
    return current + value;
  }, 0);
const memoizedAdd = memoizeOne(add);
```

> 1. there is same amount of arguments

```js
memoizedAdd(1, 2);
// the amount of arguments has changed, so underlying add function is called
memoizedAdd(1, 2, 3);
```

> 2. new arguments have strict equality (`===`) with the previous argument

```js
memoizedAdd(1, 2);
// each argument is `===` to the last argument, so cache is used
memoizedAdd(1, 2);
// second argument has changed, so add function is called again
memoizedAdd(1, 3);
// the first value is not `===` to the previous first value (1 !== 3)
// so add function is called again
memoizedAdd(3, 1);
```

> 3. **[special case]** if the arguments are not `===` and they are both `NaN` then the argument is treated as equal

```js
memoizedAdd(NaN);
// Even though NaN !== NaN these arguments are
// treated as equal as they are both `NaN`
memoizedAdd(NaN);
```

## Custom equality function

You can also pass in a custom function for checking the equality of two sets of arguments

```js
const memoized = memoizeOne(fn, isEqual);
```

An equality function should return `true` if the arguments are equal. If `true` is returned then the wrapped function will not be called.

**Tip**: A custom equality function needs to compare `Arrays`. The `newArgs` array will be a new reference every time so a simple `newArgs === lastArgs` will always return `false`.

Equality functions are not called if the `this` context of the function has changed (see below).

Here is an example that uses a [dequal](https://github.com/lukeed/dequal) deep equal equality check

> `dequal` correctly handles deep comparing two arrays

```js
import memoizeOne from 'memoize-one';
import { dequal as isDeepEqual } from 'dequal';

const identity = (x) => x;

const shallowMemoized = memoizeOne(identity);
const deepMemoized = memoizeOne(identity, isDeepEqual);

const result1 = shallowMemoized({ foo: 'bar' });
const result2 = shallowMemoized({ foo: 'bar' });

result1 === result2; // false - different object reference

const result3 = deepMemoized({ foo: 'bar' });
const result4 = deepMemoized({ foo: 'bar' });

result3 === result4; // true - arguments are deep equal
```

The equality function needs to conform to the `EqualityFn` `type`:

```ts
// TFunc is the function being memoized
type EqualityFn<TFunc extends (...args: any[]) => any> = (
  newArgs: Parameters<TFunc>,
  lastArgs: Parameters<TFunc>,
) => boolean;

// You can import this type
import type { EqualityFn } from 'memoize-one';
```

## `this`

### `memoize-one` correctly respects `this` control

This library takes special care to maintain, and allow control over the the `this` context for **both** the original function being memoized as well as the returned memoized function. Both the original function and the memoized function's `this` context respect [all the `this` controlling techniques](https://github.com/getify/You-Dont-Know-JS/blob/master/this%20%26%20object%20prototypes/ch2.md):

- new bindings (`new`)
- explicit binding (`call`, `apply`, `bind`);
- implicit binding (call site: `obj.foo()`);
- default binding (`window` or `undefined` in `strict mode`);
- fat arrow binding (binding to lexical `this`)
- ignored this (pass `null` as `this` to explicit binding)

### Changes to `this` is considered an argument change

Changes to the running context (`this`) of a function can result in the function returning a different value even though its arguments have stayed the same:

```js
function getA() {
  return this.a;
}

const temp1 = {
  a: 20,
};
const temp2 = {
  a: 30,
};

getA.call(temp1); // 20
getA.call(temp2); // 30
```

Therefore, in order to prevent against unexpected results, `memoize-one` takes into account the current execution context (`this`) of the memoized function. If `this` is different to the previous invocation then it is considered a change in argument. [further discussion](https://github.com/alexreardon/memoize-one/issues/3).

Generally this will be of no impact if you are not explicity controlling the `this` context of functions you want to memoize with [explicit binding](https://github.com/getify/You-Dont-Know-JS/blob/master/this%20%26%20object%20prototypes/ch2.md#explicit-binding) or [implicit binding](https://github.com/getify/You-Dont-Know-JS/blob/master/this%20%26%20object%20prototypes/ch2.md#implicit-binding). `memoize-One` will detect when you are manipulating `this` and will then consider the `this` context as an argument. If `this` changes, it will re-execute the original function even if the arguments have not changed.

## When your result function `throw`s

> There is no caching when your result function throws

If your result function `throw`s then the memoized function will also throw. The throw will not break the memoized functions existing argument cache. It means the memoized function will pretend like it was never called with arguments that made it `throw`.

```js
const canThrow = (name: string) => {
  console.log('called');
  if (name === 'throw') {
    throw new Error(name);
  }
  return { name };
};

const memoized = memoizeOne(canThrow);

const value1 = memoized('Alex');
// console.log => 'called'
const value2 = memoized('Alex');
// result function not called

console.log(value1 === value2);
// console.log => true

try {
  memoized('throw');
  // console.log => 'called'
} catch (e) {
  firstError = e;
}

try {
  memoized('throw');
  // console.log => 'called'
  // the result function was called again even though it was called twice
  // with the 'throw' string
} catch (e) {
  secondError = e;
}

console.log(firstError !== secondError);

const value3 = memoized('Alex');
// result function not called as the original memoization cache has not been busted
console.log(value1 === value3);
// console.log => true
```

## Performance 🚀

### Tiny

`memoize-one` is super lightweight at [![min](https://img.shields.io/bundlephobia/min/memoize-one.svg?label=)](https://www.npmjs.com/package/memoize-one) minified and [![minzip](https://img.shields.io/bundlephobia/minzip/memoize-one.svg?label=)](https://www.npmjs.com/package/memoize-one) gzipped. (`1KB` = `1,024 Bytes`)

### Extremely fast

`memoize-one` performs better or on par with than other popular memoization libraries for the purpose of remembering the latest invocation.

The comparisons are not exhaustive and are primarily to show that `memoize-one` accomplishes remembering the latest invocation really fast. The benchmarks do not take into account the differences in feature sets, library sizes, parse time, and so on.

<details>
  <summary>Expand for results</summary>
  <p>

  node version `14.15.0`

  You can run this test in the repo by:

  1. Add `"type": "module"` to the `package.json` (why is things so hard)
  2. Run `yarn perf:library-comparison`

  **no arguments**

  | Position | Library                       | Operations per second |
  |----------|-------------------------------|-----------------------|
  | 1        | memoize-one                   | 80,657,220            |
  | 2        | moize                         | 64,951,103            |
  | 3        | memoizee                      | 32,066,963            |
  | 4        | lodash.memoize                | 30,387,390            |
  | 5        | mem (JSON.stringify strategy) | 3,894,072             |
  | 6        | no memoization                | 506                   |
  | 7        | fast-memoize                  | 505                   |

  **single primitive argument**

  | Position | Library                       | Operations per second |
  |----------|-------------------------------|-----------------------|
  | 1        | fast-memoize                  | 43,922,254            |
  | 2        | lodash.memoize                | 26,652,387            |
  | 3        | moize                         | 25,654,686            |
  | 4        | memoize-one                   | 25,059,187            |
  | 5        | memoizee                      | 19,096,104            |
  | 6        | mem (JSON.stringify strategy) | 3,448,488             |
  | 7        | no memoization                | 503                   |

  **single complex argument**

  | Position | Library                       | Operations per second |
  |----------|-------------------------------|-----------------------|
  | 1        | moize                         | 31,199,164            |
  | 2        | lodash.memoize                | 28,712,860            |
  | 3        | memoize-one                   | 23,896,851            |
  | 4        | memoizee                      | 19,010,167            |
  | 5        | mem (JSON.stringify strategy) | 2,045,973             |
  | 6        | fast-memoize                  | 1,519,294             |
  | 7        | no memoization                | 504                   |

  **multiple primitive arguments**

  | Position | Library                       | Operations per second |
  |----------|-------------------------------|-----------------------|
  | 1        | moize                         | 21,039,928            |
  | 2        | lodash.memoize                | 20,248,759            |
  | 3        | memoize-one                   | 16,600,643            |
  | 4        | memoizee                      | 9,071,600             |
  | 5        | mem (JSON.stringify strategy) | 2,990,592             |
  | 6        | fast-memoize                  | 1,156,061             |
  | 7        | no memoization                | 506                   |

  **multiple complex arguments**

  | Position | Library                       | Operations per second |
  |----------|-------------------------------|-----------------------|
  | 1        | lodash.memoize                | 22,803,155            |
  | 2        | moize                         | 19,773,333            |
  | 3        | memoize-one                   | 16,341,253            |
  | 4        | memoizee                      | 9,030,317             |
  | 5        | mem (JSON.stringify strategy) | 806,040               |
  | 6        | fast-memoize                  | 633,057               |
  | 7        | no memoization                | 504                   |

  **multiple complex arguments (spreading arguments)**

  | Position | Library                       | Operations per second |
  |----------|-------------------------------|-----------------------|
  | 1        | lodash.memoize                | 24,089,032            |
  | 2        | moize                         | 21,574,025            |
  | 3        | memoizee                      | 19,810,230            |
  | 4        | memoize-one                   | 16,201,443            |
  | 5        | mem (JSON.stringify strategy) | 861,279               |
  | 6        | fast-memoize                  | 656,715               |
  | 7        | no memoization                | 504                   |
  </p>
</details>

## Code health 👍

- Tested with all built in [JavaScript types](https://github.com/getify/You-Dont-Know-JS/blob/1st-ed/types%20%26%20grammar/ch1.md)
- Written in `Typescript`
- Correct typing for `Typescript` and `flow` type systems
- No dependencies
