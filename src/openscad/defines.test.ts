import { describe, expect, it } from 'vitest'
import { parseCustomizer } from '../parser'
import { buildDefines, serializeValue } from './defines'

describe('serializeValue', () => {
  it('formats numbers and booleans as OpenSCAD literals', () => {
    expect(serializeValue(5)).toBe('5')
    expect(serializeValue(-0.25)).toBe('-0.25')
    expect(serializeValue(1e-7)).toBe('1e-7')
    expect(serializeValue(true)).toBe('true')
    expect(serializeValue(false)).toBe('false')
  })

  it('quotes strings and escapes quotes, backslashes and control characters', () => {
    expect(serializeValue('hex')).toBe('"hex"')
    expect(serializeValue('say "hi"')).toBe('"say \\"hi\\""')
    expect(serializeValue('a\\b')).toBe('"a\\\\b"')
    expect(serializeValue('line1\nline2\ttab')).toBe('"line1\\nline2\\ttab"')
    expect(serializeValue('')).toBe('""')
  })

  it('formats vectors as [a,b,c]', () => {
    expect(serializeValue([1, 2.5, -3])).toBe('[1,2.5,-3]')
  })

  it('refuses non-finite numbers', () => {
    expect(() => serializeValue(Number.NaN)).toThrow()
    expect(() => serializeValue([1, Number.POSITIVE_INFINITY])).toThrow()
  })
})

describe('buildDefines', () => {
  const { parameters } = parseCustomizer('w = 5;\nname = "a";\nv = [1, 2];\non = true;\n$fn = 96;\n$fa = 4;\n$fs = 0.5;')

  it('emits one define per parameter, using defaults where no value is given', () => {
    expect(buildDefines(parameters, { w: 7, name: 'b"c' })).toEqual([
      'w=7',
      'name="b\\"c"',
      'v=[1,2]',
      'on=true',
      '$fn=96',
      '$fa=4',
      '$fs=0.5',
    ])
  })

  it('coarsens $fn, $fa and $fs in preview quality only', () => {
    const preview = buildDefines(parameters, {}, 'preview')
    expect(preview).toContain('$fn=24')
    expect(preview).toContain('$fa=12')
    expect(preview).toContain('$fs=2')
    expect(preview).toContain('w=5')
  })

  it('never makes preview finer than the file asks for', () => {
    expect(buildDefines(parameters, { $fn: 12, $fa: 20, $fs: 5 }, 'preview')).toEqual(
      expect.arrayContaining(['$fn=12', '$fa=20', '$fs=5']),
    )
    // $fn = 0 means "use $fa/$fs" and must stay 0.
    expect(buildDefines(parameters, { $fn: 0 }, 'preview')).toContain('$fn=0')
  })
})
