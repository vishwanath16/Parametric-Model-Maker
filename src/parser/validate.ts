import type { Parameter, ParamValue } from './types'

interface NumberLimits {
  min?: number
  max?: number
  step?: number
}

const STEP_TOLERANCE = 1e-6

function validateNumber(value: number, limits: NumberLimits): string | null {
  if (!Number.isFinite(value)) return 'Enter a number'
  const { min, max, step } = limits
  if (min !== undefined && value < min) return `Must be at least ${min}`
  if (max !== undefined && value > max) return `Must be at most ${max}`
  // A step only constrains the value when there is a minimum to count from.
  if (step !== undefined && min !== undefined) {
    const steps = (value - min) / step
    if (Math.abs(steps - Math.round(steps)) > STEP_TOLERANCE) return `Must be in steps of ${step} from ${min}`
  }
  return null
}

/**
 * Checks each element of a vector parameter. Returns one entry per expected element:
 * an error message, or null if that element is valid.
 */
export function validateVector(parameter: Parameter, value: ParamValue): (string | null)[] {
  const expected = Array.isArray(parameter.defaultValue) ? parameter.defaultValue.length : 0
  const limits = parameter.control.kind === 'vector' ? parameter.control : {}
  const elements = Array.isArray(value) ? value : []
  return Array.from({ length: expected }, (_, index) => {
    const element = elements[index]
    return element === undefined ? 'Enter a number' : validateNumber(element, limits)
  })
}

/** Returns an error message for an invalid value, or null if the value is acceptable. */
export function validateValue(parameter: Parameter, value: ParamValue): string | null {
  const { control } = parameter

  if (control.kind === 'dropdown') {
    return control.options.some((option) => option.value === value) ? null : 'Choose one of the listed options'
  }

  switch (parameter.type) {
    case 'boolean':
      return typeof value === 'boolean' ? null : 'Expected true or false'
    case 'string':
      if (typeof value !== 'string') return 'Expected text'
      if (control.kind === 'text' && control.maxLength !== undefined && value.length > control.maxLength) {
        return `Must be at most ${control.maxLength} characters`
      }
      return null
    case 'number':
      if (typeof value !== 'number') return 'Enter a number'
      return validateNumber(value, control.kind === 'slider' ? control : {})
    case 'vector': {
      if (!Array.isArray(value)) return 'Expected a list of numbers'
      const errors = validateVector(parameter, value)
      if (value.length !== errors.length) return `Expected ${errors.length} values`
      const index = errors.findIndex((error) => error !== null)
      return index === -1 ? null : `Value ${index + 1}: ${errors[index]}`
    }
  }
}
