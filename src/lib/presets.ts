import { parseLiteral, parseNumber, type Parameter, type ParamValue } from '../parser'

/**
 * OpenSCAD Customizer parameter sets, as stored in the `.json` file beside a `.scad`:
 * `{ "fileFormatVersion": "1", "parameterSets": { "<name>": { "<variable>": "<value>" } } }`.
 * Every value is a string, whatever the variable's type.
 */
export type PresetSet = Record<string, string>
export type PresetSets = Record<string, PresetSet>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Parses a parameter-set file. Throws with a readable message if it is not one. */
export function parsePresetFile(text: string): PresetSets {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('The preset file is not valid JSON.')
  }
  if (!isRecord(json) || !isRecord(json.parameterSets)) {
    throw new Error('The preset file has no "parameterSets" section.')
  }
  const sets: PresetSets = {}
  for (const [name, rawSet] of Object.entries(json.parameterSets)) {
    if (!isRecord(rawSet)) continue
    const set: PresetSet = {}
    for (const [variable, value] of Object.entries(rawSet)) {
      if (typeof value === 'string') set[variable] = value
      else if (typeof value === 'number' || typeof value === 'boolean') set[variable] = String(value)
    }
    sets[name] = set
  }
  return sets
}

export function serializePresetFile(sets: PresetSets): string {
  return `${JSON.stringify({ fileFormatVersion: '1', parameterSets: sets }, null, 2)}\n`
}

function formatValue(value: ParamValue): string {
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  return String(value)
}

/** Captures the current values of every parameter as a parameter set. */
export function valuesToPreset(
  parameters: readonly Parameter[],
  values: Readonly<Record<string, ParamValue>>,
): PresetSet {
  return Object.fromEntries(
    parameters.map((parameter) => [parameter.name, formatValue(values[parameter.name] ?? parameter.defaultValue)]),
  )
}

/**
 * Converts a parameter set back to typed values. Entries for unknown variables, or
 * whose text does not match the variable's type, are left out.
 */
export function presetToValues(parameters: readonly Parameter[], set: PresetSet): Record<string, ParamValue> {
  const values: Record<string, ParamValue> = {}
  for (const parameter of parameters) {
    const raw = set[parameter.name]
    if (raw === undefined) continue
    switch (parameter.type) {
      case 'string':
        values[parameter.name] = raw
        break
      case 'boolean':
        if (raw === 'true' || raw === 'false') values[parameter.name] = raw === 'true'
        break
      case 'number': {
        const number = parseNumber(raw)
        if (number !== undefined) values[parameter.name] = number
        break
      }
      case 'vector': {
        const vector = parseLiteral(raw)
        const expected = Array.isArray(parameter.defaultValue) ? parameter.defaultValue.length : -1
        if (Array.isArray(vector) && vector.length === expected) values[parameter.name] = vector
        break
      }
    }
  }
  return values
}
