import type { Parameter, ParamValue } from '../parser'

export type Quality = 'preview' | 'render'

/** Preview caps: coarse enough to be fast, fine enough to judge the shape. */
const PREVIEW_MAX_FN = 24
const PREVIEW_MIN_FA = 12
const PREVIEW_MIN_FS = 2

const STRING_ESCAPES: Readonly<Record<string, string>> = {
  '\\': '\\\\',
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
}

/** Formats a value as an OpenSCAD literal suitable for `-D name=<literal>`. */
export function serializeValue(value: ParamValue): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') return `"${value.replace(/[\\"\n\r\t]/g, (char) => STRING_ESCAPES[char] ?? char)}"`
  if (Array.isArray(value)) return `[${value.map(serializeValue).join(',')}]`
  if (!Number.isFinite(value)) throw new Error('Cannot pass a non-finite number to OpenSCAD')
  return String(value)
}

/** In preview quality, coarsens `$fn`, `$fa` and `$fs` where the file exposes them. */
function previewValue(name: string, value: ParamValue): ParamValue {
  if (typeof value !== 'number') return value
  if (name === '$fn') return value > PREVIEW_MAX_FN ? PREVIEW_MAX_FN : value
  if (name === '$fa') return Math.max(value, PREVIEW_MIN_FA)
  if (name === '$fs') return Math.max(value, PREVIEW_MIN_FS)
  return value
}

/** Builds the `name=value` strings passed to OpenSCAD, one per customizable parameter. */
export function buildDefines(
  parameters: readonly Parameter[],
  values: Readonly<Record<string, ParamValue>>,
  quality: Quality = 'render',
): string[] {
  return parameters.map((parameter) => {
    const value = values[parameter.name] ?? parameter.defaultValue
    return `${parameter.name}=${serializeValue(quality === 'preview' ? previewValue(parameter.name, value) : value)}`
  })
}
