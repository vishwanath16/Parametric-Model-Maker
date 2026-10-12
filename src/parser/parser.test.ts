import { describe, expect, it } from 'vitest'
import { parseCustomizer, type Parameter, type ParseResult } from './index'
import adapterSource from './__fixtures__/adapter.scad?raw'
import hintsSource from './__fixtures__/hints.scad?raw'
import edgeCasesSource from './__fixtures__/edge-cases.scad?raw'

function get(result: ParseResult, name: string): Parameter {
  const parameter = result.parameters.find((candidate) => candidate.name === name)
  if (!parameter) throw new Error(`Parameter "${name}" was not parsed`)
  return parameter
}

const names = (result: ParseResult): string[] => result.parameters.map((parameter) => parameter.name)

describe('groups (adapter.scad)', () => {
  const result = parseCustomizer(adapterSource)

  it('creates one group per header, in source order', () => {
    expect(result.groups.map((group) => group.name)).toEqual([
      'Fit - radial clearance per side, mm',
      'Body',
      '3/8"-16 socket (bottom, female)',
      '1/4"-20 stud (top, male)',
      'Quality',
    ])
    expect(result.groups.map((group) => group.parameters.length)).toEqual([2, 4, 2, 2, 2])
  })

  it('hides variables under [Hidden]', () => {
    expect(names(result)).not.toContain('INCH')
    expect(names(result)).not.toContain('socket_major')
  })

  it('ignores everything from the first module onwards', () => {
    expect(names(result)).not.toContain('inside_module')
    expect(names(result)).not.toContain('after_module')
  })

  it('turns underscores into spaces when there is no description', () => {
    const parameter = get(result, 'ext_clear')
    expect(parameter.label).toBe('ext clear')
    expect(parameter.description).toBeUndefined()
    expect(parameter.defaultValue).toBe(0.2)
    expect(parameter.control).toEqual({ kind: 'number' })
  })

  it('uses the comment directly above as label and description', () => {
    const parameter = get(result, 'body_d')
    expect(parameter.label).toBe('Outer diameter of the knurled body')
    expect(parameter.description).toBe('Outer diameter of the knurled body')
    expect(parameter.control).toEqual({ kind: 'slider', min: 14, max: 40, step: 0.5 })
  })

  it('does not treat the group header or a file header comment as a description', () => {
    expect(get(result, 'ext_clear').description).toBeUndefined()
    expect(get(result, 'body_h').description).toBeUndefined()
  })

  it('includes special variables such as $fn', () => {
    const parameter = get(result, '$fn')
    expect(parameter.label).toBe('$fn')
    expect(parameter.group).toBe('Quality')
    expect(parameter.control).toEqual({ kind: 'slider', min: 16, max: 128, step: 8 })
  })

  it('records the line of each assignment', () => {
    expect(get(result, 'ext_clear').line).toBe(4)
    expect(get(result, 'body_d').line).toBe(9)
  })
})

describe('hints (hints.scad)', () => {
  const result = parseCustomizer(hintsSource)

  it('puts variables before any header in the Global group', () => {
    expect(result.groups[0]?.name).toBe('Global')
    expect(get(result, 'before_header').group).toBe('Global')
  })

  it('number without a hint → plain number input', () => {
    const parameter = get(result, 'plain')
    expect(parameter.type).toBe('number')
    expect(parameter.defaultValue).toBe(12.5)
    expect(parameter.control).toEqual({ kind: 'number' })
  })

  it('[min:max] → slider', () => {
    expect(get(result, 'wall').control).toEqual({ kind: 'slider', min: 1, max: 5 })
    expect(get(result, 'wall').label).toBe('Wall thickness in mm')
  })

  it('[min:step:max] → slider with step', () => {
    expect(get(result, 'stepped').control).toEqual({ kind: 'slider', min: 0, max: 10, step: 0.5 })
  })

  it('[max] → slider from zero', () => {
    expect(get(result, 'max_only').control).toEqual({ kind: 'slider', min: 0, max: 100 })
  })

  it('bare number hint on a number → step', () => {
    expect(get(result, 'spin_step').control).toEqual({ kind: 'number', step: 0.5 })
  })

  it('handles negative and scientific literals', () => {
    expect(get(result, 'negative').defaultValue).toBe(-4)
    expect(get(result, 'negative').control).toEqual({ kind: 'slider', min: -10, max: 10 })
    expect(get(result, 'sci').defaultValue).toBe(0.001)
  })

  it('[a, b, c] on a number → numeric dropdown', () => {
    expect(get(result, 'count').control).toEqual({
      kind: 'dropdown',
      options: [
        { value: 2, label: '2' },
        { value: 4, label: '4' },
        { value: 8, label: '8' },
      ],
    })
  })

  it('[10:Small, 20:Medium] → labelled numeric dropdown', () => {
    expect(get(result, 'size').control).toEqual({
      kind: 'dropdown',
      options: [
        { value: 10, label: 'Small' },
        { value: 20, label: 'Medium' },
        { value: 30, label: 'Large' },
      ],
    })
  })

  it('[a, b, c] on a string → string dropdown', () => {
    const parameter = get(result, 'shape')
    expect(parameter.type).toBe('string')
    expect(parameter.control).toEqual({
      kind: 'dropdown',
      options: [
        { value: 'hex', label: 'hex' },
        { value: 'round', label: 'round' },
        { value: 'square', label: 'square' },
      ],
    })
  })

  it('[m:Matte, g:Glossy] on a string → labelled string dropdown', () => {
    expect(get(result, 'finish').control).toEqual({
      kind: 'dropdown',
      options: [
        { value: 'm', label: 'Matte' },
        { value: 'g', label: 'Glossy' },
      ],
    })
  })

  it('string without a hint → text input', () => {
    const parameter = get(result, 'name')
    expect(parameter.defaultValue).toBe('Vishu')
    expect(parameter.control).toEqual({ kind: 'text' })
  })

  it('bare integer hint on a string → max length', () => {
    expect(get(result, 'tag').control).toEqual({ kind: 'text', maxLength: 8 })
  })

  it('booleans → toggle, whatever the hint', () => {
    expect(get(result, 'enabled')).toMatchObject({ type: 'boolean', defaultValue: true, control: { kind: 'toggle' } })
    expect(get(result, 'rounded')).toMatchObject({ type: 'boolean', defaultValue: false, control: { kind: 'toggle' } })
  })

  it('vector without a hint → one input per element', () => {
    const parameter = get(result, 'offset')
    expect(parameter.type).toBe('vector')
    expect(parameter.defaultValue).toEqual([1, 2, 3])
    expect(parameter.control).toEqual({ kind: 'vector' })
  })

  it('[min:max] and [min:step:max] on a vector apply to every element', () => {
    expect(get(result, 'dims').control).toEqual({ kind: 'vector', min: 0, max: 100 })
    expect(get(result, 'fine').control).toEqual({ kind: 'vector', min: 0, max: 5, step: 0.25 })
  })
})

describe('edge cases (edge-cases.scad)', () => {
  const result = parseCustomizer(edgeCasesSource)

  it('keeps only literal assignments, in order', () => {
    expect(names(result)).toEqual(['url', 'quote', 'points', 'a', 'b', 'after_block', 'shown'])
  })

  it('skips expressions, references, ranges, nested, mixed and empty vectors', () => {
    for (const name of ['derived', 'ref', 'neg_expr', 'range', 'nested', 'mixed', 'empty', 'call', 'undef_value']) {
      expect(names(result)).not.toContain(name)
    }
  })

  it('does not split strings on ";" or "//"', () => {
    expect(get(result, 'url').defaultValue).toBe('http://example.com/a;b')
    expect(get(result, 'url').control).toEqual({ kind: 'text' })
  })

  it('decodes escapes and ignores hint-like text inside a string', () => {
    expect(get(result, 'quote').defaultValue).toBe('say "hi" // [1:2]')
    expect(get(result, 'quote').control).toEqual({ kind: 'text' })
  })

  it('parses multi-line vectors with inner comments and a trailing comma', () => {
    const parameter = get(result, 'points')
    expect(parameter.defaultValue).toEqual([1, 2, 3])
    expect(parameter.control).toEqual({ kind: 'vector', min: 0, max: 10 })
    expect(parameter.line).toBe(8)
  })

  it('gives a trailing hint only to the last assignment on a line', () => {
    expect(get(result, 'b').control).toEqual({ kind: 'slider', min: 0, max: 5 })
    expect(get(result, 'a').control).toEqual({ kind: 'number' })
  })

  it('lets the last duplicate assignment win, at the first position', () => {
    expect(get(result, 'a').defaultValue).toBe(9)
    expect(get(result, 'a').line).toBe(13)
  })

  it('ignores assignments inside top-level blocks and statements inside strings', () => {
    expect(names(result)).not.toContain('inner')
    expect(names(result)).not.toContain('x')
  })

  it('only uses a comment as description when it is directly above', () => {
    expect(get(result, 'after_block').description).toBe('Described after a block')
    expect(get(result, 'url').description).toBeUndefined()
  })

  it('resumes showing variables after a [Hidden] section ends', () => {
    expect(names(result)).not.toContain('secret')
    expect(get(result, 'shown').group).toBe('Shown Again')
  })

  it('stops at the first function', () => {
    expect(names(result)).not.toContain('after_function')
  })
})

describe('inline cases', () => {
  it('returns nothing for empty or parameterless input', () => {
    expect(parseCustomizer('')).toEqual({ groups: [], parameters: [] })
    expect(parseCustomizer('cube(10);')).toEqual({ groups: [], parameters: [] })
  })

  it('handles CRLF line endings and a byte-order mark', () => {
    const result = parseCustomizer('﻿// Width\r\nwidth = 5; // [1:10]\r\n')
    expect(get(result, 'width')).toMatchObject({
      label: 'Width',
      defaultValue: 5,
      control: { kind: 'slider', min: 1, max: 10 },
    })
  })

  it('handles a final line with no newline', () => {
    expect(get(parseCustomizer('x = 1; // [0:2]'), 'x').control).toEqual({ kind: 'slider', min: 0, max: 2 })
  })

  it('does not throw on unterminated input', () => {
    expect(parseCustomizer('a = 1;\nb = "unterminated').parameters.map((p) => p.name)).toEqual(['a'])
    expect(parseCustomizer('a = 1;\n/* never closed').parameters.map((p) => p.name)).toEqual(['a'])
    expect(parseCustomizer('a = 1;\nb = 2').parameters.map((p) => p.name)).toEqual(['a'])
  })

  it('does not mistake identifiers that start with a keyword for a module', () => {
    expect(names(parseCustomizer('module_count = 3;\nfunction_id = 4;\nused = 1;'))).toEqual([
      'module_count',
      'function_id',
      'used',
    ])
  })

  it('merges repeated group headers and drops empty groups', () => {
    const result = parseCustomizer('/* [A] */\na = 1;\n/* [Empty] */\n/* [B] */\nb = 2;\n/* [A] */\nc = 3;')
    expect(result.groups.map((group) => [group.name, group.parameters.map((p) => p.name)])).toEqual([
      ['A', ['a', 'c']],
      ['B', ['b']],
    ])
  })

  it('falls back to a plain input when a hint is malformed', () => {
    expect(get(parseCustomizer('x = 5; // [10:1]'), 'x').control).toEqual({ kind: 'number' })
    expect(get(parseCustomizer('x = 5; // [0:0:10]'), 'x').control).toEqual({ kind: 'number' })
    expect(get(parseCustomizer('x = 5; // [a, b]'), 'x').control).toEqual({ kind: 'number' })
    expect(get(parseCustomizer('x = 5; // just a note'), 'x').control).toEqual({ kind: 'number' })
    expect(get(parseCustomizer('v = [1, 2]; // [a, b]'), 'v').control).toEqual({ kind: 'vector' })
  })

  it('treats a single labelled item as a dropdown, not a range', () => {
    expect(get(parseCustomizer('x = 10; // [10:Small]'), 'x').control).toEqual({
      kind: 'dropdown',
      options: [{ value: 10, label: 'Small' }],
    })
  })

  it('ignores a comment above that is separated by a blank line', () => {
    expect(get(parseCustomizer('// far away\n\nx = 1;'), 'x').description).toBeUndefined()
  })

  it('does not use the previous line’s trailing comment as a description', () => {
    expect(get(parseCustomizer('a = 1; // [0:5]\nb = 2;'), 'b').description).toBeUndefined()
  })
})
