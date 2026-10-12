import { validateValue, type Parameter, type ParamValue, type ParseResult } from '../parser'

export type Values = Record<string, ParamValue>

export function sameValue(a: ParamValue | undefined, b: ParamValue | undefined): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => Object.is(item, b[i]))
  return Object.is(a, b)
}

function sameType(a: Parameter, b: Parameter): boolean {
  if (a.type !== b.type) return false
  return !Array.isArray(a.defaultValue) || !Array.isArray(b.defaultValue) || a.defaultValue.length === b.defaultValue.length
}

export function defaultValues(parsed: ParseResult): Values {
  return Object.fromEntries(parsed.parameters.map((parameter) => [parameter.name, parameter.defaultValue]))
}

/**
 * Values for a re-parsed file. A value the user had changed is kept when the variable
 * still exists with the same type; everything else takes the (possibly new) default.
 */
export function carryOverValues(next: ParseResult, previous: ParseResult | undefined, previousValues: Values): Values {
  const previousByName = new Map(previous?.parameters.map((parameter) => [parameter.name, parameter]))
  return Object.fromEntries(
    next.parameters.map((parameter) => {
      const before = previousByName.get(parameter.name)
      const value = previousValues[parameter.name]
      const edited = before !== undefined && value !== undefined && !sameValue(value, before.defaultValue)
      return [parameter.name, edited && sameType(parameter, before) ? value : parameter.defaultValue]
    }),
  )
}

/** Keeps stored values only where they still match a parameter's type; fills the rest with defaults. */
export function reconcileValues(parsed: ParseResult, stored: Values | undefined): Values {
  return Object.fromEntries(
    parsed.parameters.map((parameter) => {
      const value = stored?.[parameter.name]
      const matches =
        value !== undefined &&
        (Array.isArray(parameter.defaultValue)
          ? Array.isArray(value) && value.length === parameter.defaultValue.length
          : typeof value === typeof parameter.defaultValue)
      return [parameter.name, matches ? value : parameter.defaultValue]
    }),
  )
}

/** The first validation error among the current values, or null when every value is valid. */
export function firstError(parsed: ParseResult, values: Values): string | null {
  for (const parameter of parsed.parameters) {
    const error = validateValue(parameter, values[parameter.name] ?? parameter.defaultValue)
    if (error) return `${parameter.label}: ${error}`
  }
  return null
}
