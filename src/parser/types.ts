/** A customizable value: a number, boolean, string, or a vector of numbers. */
export type ParamValue = number | boolean | string | number[]

export type ParamType = 'number' | 'boolean' | 'string' | 'vector'

export interface DropdownOption {
  value: number | string
  label: string
}

/** How a parameter should be edited, derived from its type and trailing comment hint. */
export type Control =
  /** Plain number input. `step` comes from a bare-number hint such as `// 0.5`. */
  | { kind: 'number'; step?: number }
  /** `// [min:max]`, `// [min:step:max]` or `// [max]` on a number. */
  | { kind: 'slider'; min: number; max: number; step?: number }
  /** `// [a, b, c]` or `// [10:Small, 20:Medium]`. */
  | { kind: 'dropdown'; options: DropdownOption[] }
  /** Text input. `maxLength` comes from a bare-integer hint such as `// 8`. */
  | { kind: 'text'; maxLength?: number }
  | { kind: 'toggle' }
  /** One number input per element; any range hint applies to every element. */
  | { kind: 'vector'; min?: number; max?: number; step?: number }

export interface Parameter {
  /** Variable name exactly as written in the source, e.g. `ext_clear` or `$fn`. */
  name: string
  /** The description comment if there is one, otherwise the name with underscores as spaces. */
  label: string
  /** The `//` comment on the line directly above the assignment, if any. */
  description?: string
  group: string
  type: ParamType
  defaultValue: ParamValue
  control: Control
  /** 1-based line on which the assignment starts. */
  line: number
}

export interface ParameterGroup {
  name: string
  parameters: Parameter[]
}

export interface ParseResult {
  /** Visible groups in source order; `[Hidden]` and empty groups are omitted. */
  groups: ParameterGroup[]
  /** Every visible parameter in source order. */
  parameters: Parameter[]
}

export const GLOBAL_GROUP = 'Global'
export const HIDDEN_GROUP = 'Hidden'
