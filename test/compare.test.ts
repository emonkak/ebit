import { describe, expect, it } from 'vitest';

import {
  dependenciesAreChanged,
  sequentialEqual,
  shallowEqual,
} from '../src/compare.js';

describe('dependenciesAreChanged()', () => {
  it('should return true if a old or new dependency is null', () => {
    expect(dependenciesAreChanged(null, null)).toBe(true);
    expect(dependenciesAreChanged(null, [])).toBe(true);
    expect(dependenciesAreChanged([], null)).toBe(true);
  });

  it('should return true if the lengths of the new and old dependencies are different', () => {
    expect(dependenciesAreChanged([], ['foo'])).toBe(true);
    expect(dependenciesAreChanged(['foo'], [])).toBe(true);
    expect(dependenciesAreChanged(['foo'], ['foo', 'bar'])).toBe(true);
    expect(dependenciesAreChanged(['foo', 'bar'], ['foo'])).toBe(true);
  });

  it('should return true if there is a dependency that is not same from the other one', () => {
    expect(dependenciesAreChanged(['foo'], ['FOO'])).toBe(true);
    expect(dependenciesAreChanged(['FOO'], ['foo'])).toBe(true);
    expect(dependenciesAreChanged(['foO', 'bar'], ['FOO', 'bar'])).toBe(true);
    expect(dependenciesAreChanged(['FOO', 'bar'], ['foo', 'bar'])).toBe(true);
    expect(dependenciesAreChanged(['foo', 'bar'], ['foo', 'BAR'])).toBe(true);
    expect(dependenciesAreChanged(['foo', 'BAR'], ['foo', 'bar'])).toBe(true);
    expect(dependenciesAreChanged(['foo', 'bar'], ['FOO', 'BAR'])).toBe(true);
    expect(dependenciesAreChanged(['FOO', 'BAR'], ['foo', 'bar'])).toBe(true);
    expect(dependenciesAreChanged(['0'], [0])).toBe(true);
    expect(dependenciesAreChanged([0], ['0'])).toBe(true);
    expect(dependenciesAreChanged([1], ['1'])).toBe(true);
    expect(dependenciesAreChanged(['1'], [1])).toBe(true);
  });

  it('should return false if all dependencies are same', () => {
    expect(dependenciesAreChanged(['foo'], ['foo'])).toBe(false);
    expect(dependenciesAreChanged(['foo', 'bar'], ['foo', 'bar'])).toBe(false);
    expect(dependenciesAreChanged([0], [0])).toBe(false);
    expect(dependenciesAreChanged(['0'], ['0'])).toBe(false);
    expect(dependenciesAreChanged([1], [1])).toBe(false);
    expect(dependenciesAreChanged(['1'], ['1'])).toBe(false);
    expect(dependenciesAreChanged([Number.NaN], [Number.NaN])).toBe(false);
  });

  it('should return false if there are no dependencies', () => {
    expect(dependenciesAreChanged([], [])).toBe(false);
  });
});

describe('sequentialEqual()', () => {
  it('should return false if the lengths of the first and second are different', () => {
    expect(sequentialEqual([], ['foo'])).toBe(false);
    expect(sequentialEqual(['foo'], [])).toBe(false);
    expect(sequentialEqual(['foo'], ['foo', 'bar'])).toBe(false);
    expect(sequentialEqual(['foo', 'bar'], ['foo'])).toBe(false);
  });

  it('should return false if there is a value that is not same from the other one', () => {
    expect(sequentialEqual(['foo'], ['FOO'])).toBe(false);
    expect(sequentialEqual(['FOO'], ['foo'])).toBe(false);
    expect(sequentialEqual(['foO', 'bar'], ['FOO', 'bar'])).toBe(false);
    expect(sequentialEqual(['FOO', 'bar'], ['foo', 'bar'])).toBe(false);
    expect(sequentialEqual(['foo', 'bar'], ['foo', 'BAR'])).toBe(false);
    expect(sequentialEqual(['foo', 'BAR'], ['foo', 'bar'])).toBe(false);
    expect(sequentialEqual(['foo', 'bar'], ['FOO', 'BAR'])).toBe(false);
    expect(sequentialEqual(['FOO', 'BAR'], ['foo', 'bar'])).toBe(false);
    expect(sequentialEqual<unknown>(['0'], [0])).toBe(false);
    expect(sequentialEqual<unknown>([0], ['0'])).toBe(false);
    expect(sequentialEqual<unknown>([1], ['1'])).toBe(false);
    expect(sequentialEqual<unknown>(['1'], [1])).toBe(false);
  });

  it('should return true if all values are same', () => {
    expect(sequentialEqual(['foo'], ['foo'])).toBe(true);
    expect(sequentialEqual(['foo', 'bar'], ['foo', 'bar'])).toBe(true);
    expect(sequentialEqual([0], [0])).toBe(true);
    expect(sequentialEqual(['0'], ['0'])).toBe(true);
    expect(sequentialEqual([1], [1])).toBe(true);
    expect(sequentialEqual(['1'], ['1'])).toBe(true);
    expect(sequentialEqual([Number.NaN], [Number.NaN])).toBe(true);
  });

  it('should return true if there are no values', () => {
    expect(sequentialEqual([], [])).toBe(true);
  });
});

describe('shallowEqual()', () => {
  it('should return true if same values are given', () => {
    const props = { foo: 1 };
    expect(shallowEqual(props, props)).toBe(true);
  });

  it('should return true if all properties have the same value', () => {
    expect(shallowEqual({}, {})).toBe(true);
    expect(shallowEqual({ foo: 1 }, { foo: 1 })).toBe(true);
    expect(shallowEqual({ foo: 1, bar: 2 }, { foo: 1, bar: 2 })).toBe(true);
    expect(shallowEqual({ foo: Number.NaN }, { foo: Number.NaN })).toBe(true);
  });

  it('should return false if there is a property that is not same from the other one', () => {
    expect(shallowEqual({ foo: '1' }, { foo: 1 })).toBe(false);
    expect(shallowEqual({ foo: 1 }, { foo: '1' })).toBe(false);
  });

  it('should return false if the number of properties does not match', () => {
    expect(shallowEqual({ foo: 1 }, {})).toBe(false);
    expect(shallowEqual({ foo: 1 }, { foo: 1, bar: 1 })).toBe(false);
    expect(shallowEqual({ foo: 1, bar: 1 }, {})).toBe(false);
    expect(shallowEqual({ foo: 1, bar: 1 }, { foo: 1 })).toBe(false);
    expect(shallowEqual({}, { foo: 1 })).toBe(false);
  });
});
