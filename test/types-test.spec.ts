/* eslint-disable @typescript-eslint/no-unused-vars */
import { EqualityFn } from './../src/memoize-one';
import { expectTypeOf } from 'expect-type';
import memoize from '../src/memoize-one';

it('should maintain the types of the original function', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function getLocation(this: Window, value: number) {
    return this.location;
  }
  const memoized = memoize(getLocation);

  expectTypeOf<ThisParameterType<typeof getLocation>>().toEqualTypeOf<
    ThisParameterType<typeof memoized>
  >();
  expectTypeOf<Parameters<typeof getLocation>>().toEqualTypeOf<Parameters<typeof memoized>>();
  expectTypeOf<ReturnType<typeof getLocation>>().toEqualTypeOf<ReturnType<typeof memoized>>();
});

it('should add a .clear function property', () => {
  function add(first: number, second: number) {
    return first + second;
  }
  const memoized = memoize(add);
  memoized.clear();

  // @ts-expect-error
  expect(() => memoized.foo()).toThrow();

  expectTypeOf<typeof memoized.clear>().toEqualTypeOf<() => void>();
});

it('should type the equality function to based on the provided function', () => {
  function add(first: number, second: number) {
    return first + second;
  }

  expectTypeOf<EqualityFn<typeof add>>().toEqualTypeOf<
    (newArgs: Parameters<typeof add>, lastArgs: Parameters<typeof add>) => boolean
  >();
  expectTypeOf<EqualityFn<typeof add>>().toEqualTypeOf<
    (newArgs: [number, number], lastArgs: [number, number]) => boolean
  >();
});

it('should allow weaker equality function types', () => {
  function add(first: number, second: number): number {
    return first + second;
  }

  // ✅ parameters of `add`
  {
    const isEqual = function (first: Parameters<typeof add>, second: Parameters<typeof add>) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ tuple of the correct types
  {
    const isEqual = function (first: [number, number], second: [number, number]) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ array of the correct types
  {
    const isEqual = function (first: number[], second: number[]) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ tuple of 'unknown'
  {
    const isEqual = function (first: [unknown, unknown], second: [unknown, unknown]) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ array of 'unknown'
  {
    const isEqual = function (first: unknown[], second: unknown[]) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ tuple of 'unknown'
  {
    const isEqual = function (...first: unknown[]) {
      return !!first;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ tuple of 'any'
  {
    const isEqual = function (first: [any, any], second: [any, any]) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ array of 'any'
  {
    const isEqual = function (first: any[], second: any[]) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ two arguments of type any
  {
    const isEqual = function (first: any, second: any) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ a single argument of type any
  {
    const isEqual = function (first: any) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }

  // ✅ spread of any type
  {
    const isEqual = function (...first: any[]) {
      return true;
    };
    expectTypeOf<typeof isEqual>().toMatchTypeOf<EqualityFn<typeof add>>();
  }
});
