import { describe, expect, it } from 'vitest'
import { parseCustomizer } from '../parser'
import { carryOverValues, defaultValues, firstError, reconcileValues, sameValue } from './values'

describe('values', () => {
  it('compares scalars and vectors by value', () => {
    expect(sameValue([1, 2], [1, 2])).toBe(true)
    expect(sameValue([1, 2], [1, 3])).toBe(false)
    expect(sameValue(Number.NaN, Number.NaN)).toBe(true)
    expect(sameValue('1', 1)).toBe(false)
  })

  it('keeps edited values across a re-parse and adopts new defaults for untouched ones', () => {
    const before = parseCustomizer('a = 1;\nb = 2;\nc = "x";\nv = [1, 2];')
    const after = parseCustomizer('a = 10;\nb = 20;\nc = 5;\nv = [1, 2, 3];\nd = true;')
    const values = { ...defaultValues(before), b: 7, c: 'edited', v: [9, 9] }
    expect(carryOverValues(after, before, values)).toEqual({
      a: 10, // untouched → new default
      b: 7, // edited → kept
      c: 5, // type changed → new default
      v: [1, 2, 3], // length changed → new default
      d: true, // new variable
    })
  })

  it('drops stored values that no longer fit the parameter', () => {
    const parsed = parseCustomizer('a = 1;\nv = [1, 2];\ns = "x";')
    expect(reconcileValues(parsed, { a: 'oops', v: [5, 6], s: 'kept', gone: 1 })).toEqual({ a: 1, v: [5, 6], s: 'kept' })
    expect(reconcileValues(parsed, undefined)).toEqual({ a: 1, v: [1, 2], s: 'x' })
  })

  it('reports the first invalid value with its label', () => {
    const parsed = parseCustomizer('// Wall\nwall = 2; // [1:5]\nn = 3;')
    expect(firstError(parsed, { wall: 2, n: 3 })).toBeNull()
    expect(firstError(parsed, { wall: 9, n: Number.NaN })).toBe('Wall: Must be at most 5')
  })
})
