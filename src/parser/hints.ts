import { parseNumber } from './literals'
import type { Control, DropdownOption, ParamValue } from './types'

interface Range {
  min: number
  max: number
  step?: number
}

/** Returns the text inside a leading `[...]`, or undefined if the comment is not a bracket hint. */
function bracketContent(comment: string): string | undefined {
  return /^\[([^\]]*)\]/.exec(comment)?.[1]
}

/** `max`, `min:max` or `min:step:max`, all numeric. */
function parseRange(inner: string): Range | undefined {
  if (inner.includes(',')) return undefined
  const parts = inner.split(':').map(parseNumber)
  const [a, b, c] = parts
  let range: Range
  if (parts.length === 1 && a !== undefined) range = { min: 0, max: a }
  else if (parts.length === 2 && a !== undefined && b !== undefined) range = { min: a, max: b }
  else if (parts.length === 3 && a !== undefined && b !== undefined && c !== undefined) {
    range = { min: a, max: c, step: b }
  } else return undefined
  if (range.min > range.max) return undefined
  if (range.step !== undefined && range.step <= 0) return undefined
  return range
}

/** `a, b, c` or `10:Small, 20:Medium`. With `numeric`, every value must be a number. */
function parseOptions(inner: string, numeric: boolean): DropdownOption[] | undefined {
  const options: DropdownOption[] = []
  for (const item of inner.split(',')) {
    if (item.trim() === '') continue
    const colon = item.indexOf(':')
    const rawValue = (colon === -1 ? item : item.slice(0, colon)).trim()
    const rawLabel = colon === -1 ? '' : item.slice(colon + 1).trim()
    const value = numeric ? parseNumber(rawValue) : rawValue
    if (value === undefined) return undefined
    options.push({ value, label: rawLabel || rawValue })
  }
  return options.length > 0 ? options : undefined
}

/** Chooses the form control for a value from its type and its trailing `//` comment. */
export function controlFor(value: ParamValue, comment: string | undefined): Control {
  const hint = comment?.trim() ?? ''
  const inner = bracketContent(hint)
  const bare = inner === undefined ? parseNumber(hint) : undefined

  if (typeof value === 'boolean') return { kind: 'toggle' }

  if (typeof value === 'string') {
    if (inner !== undefined) {
      const options = parseOptions(inner, false)
      if (options) return { kind: 'dropdown', options }
    }
    if (bare !== undefined && Number.isInteger(bare) && bare > 0) return { kind: 'text', maxLength: bare }
    return { kind: 'text' }
  }

  const step = bare !== undefined && bare > 0 ? bare : undefined

  if (Array.isArray(value)) {
    const range = inner === undefined ? undefined : parseRange(inner)
    if (range) return { kind: 'vector', ...range }
    return step === undefined ? { kind: 'vector' } : { kind: 'vector', step }
  }

  if (inner !== undefined) {
    const range = parseRange(inner)
    if (range) return { kind: 'slider', ...range }
    // An all-numeric `a:b` or `a:b:c` that failed above is a bad range, not a labelled option.
    const rangeShaped = !inner.includes(',') && inner.split(':').every((part) => parseNumber(part) !== undefined)
    const options = rangeShaped ? undefined : parseOptions(inner, true)
    if (options) return { kind: 'dropdown', options }
  }
  return step === undefined ? { kind: 'number' } : { kind: 'number', step }
}
