import { describe, expect, it } from 'vitest'
import { parseCustomizer, validateValue, validateVector, type Parameter } from './index'

function param(source: string): Parameter {
  const parameter = parseCustomizer(source).parameters[0]
  if (!parameter) throw new Error(`No parameter parsed from: ${source}`)
  return parameter
}

describe('validateValue', () => {
  it('accepts every default value', () => {
    const sources = [
      'x = 5;',
      'x = 5; // [0:10]',
      'x = 2.5; // [0:0.5:10]',
      'x = 4; // [2, 4, 8]',
      'x = "hex"; // [hex, round]',
      'x = "abc"; // 8',
      'x = true;',
      'x = [1, 2, 3]; // [0:10]',
    ]
    for (const source of sources) {
      const parameter = param(source)
      expect(validateValue(parameter, parameter.defaultValue), source).toBeNull()
    }
  })

  it('enforces slider min and max', () => {
    const slider = param('x = 5; // [1:10]')
    expect(validateValue(slider, 0.5)).toBe('Must be at least 1')
    expect(validateValue(slider, 11)).toBe('Must be at most 10')
    expect(validateValue(slider, 1)).toBeNull()
    expect(validateValue(slider, 10)).toBeNull()
  })

  it('enforces slider step, tolerating floating-point error', () => {
    const slider = param('x = 0.3; // [0:0.1:1]')
    expect(validateValue(slider, 0.3)).toBeNull()
    expect(validateValue(slider, 0.7)).toBeNull()
    expect(validateValue(slider, 0.35)).toBe('Must be in steps of 0.1 from 0')
  })

  it('counts steps from the minimum', () => {
    const slider = param('x = 3; // [1:2:9]')
    expect(validateValue(slider, 5)).toBeNull()
    expect(validateValue(slider, 4)).toBe('Must be in steps of 2 from 1')
  })

  it('rejects non-finite numbers', () => {
    expect(validateValue(param('x = 5;'), Number.NaN)).toBe('Enter a number')
    expect(validateValue(param('x = 5;'), Number.POSITIVE_INFINITY)).toBe('Enter a number')
  })

  it('does not constrain a plain number, even with a step hint', () => {
    expect(validateValue(param('x = 5;'), -1e9)).toBeNull()
    expect(validateValue(param('x = 1.5; // 0.5'), 1.7)).toBeNull()
  })

  it('requires dropdown values to be one of the options', () => {
    expect(validateValue(param('x = 4; // [2, 4, 8]'), 8)).toBeNull()
    expect(validateValue(param('x = 4; // [2, 4, 8]'), 5)).toBe('Choose one of the listed options')
    expect(validateValue(param('x = "hex"; // [hex, round]'), 'square')).toBe('Choose one of the listed options')
  })

  it('enforces string max length', () => {
    const text = param('x = "abc"; // 4')
    expect(validateValue(text, 'abcd')).toBeNull()
    expect(validateValue(text, 'abcde')).toBe('Must be at most 4 characters')
  })

  it('rejects values of the wrong type', () => {
    expect(validateValue(param('x = 5;'), 'five')).toBe('Enter a number')
    expect(validateValue(param('x = "a";'), 5)).toBe('Expected text')
    expect(validateValue(param('x = true;'), 1)).toBe('Expected true or false')
    expect(validateValue(param('x = [1, 2];'), 1)).toBe('Expected a list of numbers')
  })

  it('validates vectors element by element', () => {
    const vector = param('x = [1, 2, 3]; // [0:10]')
    expect(validateValue(vector, [1, 20, 3])).toBe('Value 2: Must be at most 10')
    expect(validateValue(vector, [1, 2])).toBe('Expected 3 values')
    expect(validateVector(vector, [-1, 2, Number.NaN])).toEqual(['Must be at least 0', null, 'Enter a number'])
  })
})
