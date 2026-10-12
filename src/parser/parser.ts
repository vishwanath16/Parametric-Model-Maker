import { controlFor } from './hints'
import { parseLiteral } from './literals'
import { scanTopLevel } from './scanner'
import {
  GLOBAL_GROUP,
  HIDDEN_GROUP,
  type Parameter,
  type ParameterGroup,
  type ParamType,
  type ParamValue,
  type ParseResult,
} from './types'

const ASSIGNMENT = /^([A-Za-z_$][A-Za-z0-9_]*)\s*=(?!=)([\s\S]+)$/

function typeOf(value: ParamValue): ParamType {
  if (Array.isArray(value)) return 'vector'
  if (typeof value === 'boolean') return 'boolean'
  return typeof value === 'string' ? 'string' : 'number'
}

/** `ext_clear` → `ext clear`. */
export function labelFromName(name: string): string {
  return name.replace(/_+/g, ' ').trim() || name
}

/**
 * Extracts OpenSCAD Customizer parameters from .scad source.
 *
 * Only top-level assignments of literal values before the first module or function
 * count. Never throws: malformed input simply yields fewer parameters.
 */
export function parseCustomizer(source: string): ParseResult {
  const events = scanTopLevel(source)
  const byName = new Map<string, Parameter>()
  let group = GLOBAL_GROUP

  events.forEach((event, index) => {
    if (event.type === 'group') {
      group = event.name || GLOBAL_GROUP
      return
    }
    if (event.type !== 'statement') return

    const match = ASSIGNMENT.exec(event.text)
    const name = match?.[1]
    const defaultValue = parseLiteral(match?.[2] ?? '')
    if (name === undefined || defaultValue === undefined) return

    const previous = events[index - 1]
    const next = events[index + 1]
    const description =
      previous?.type === 'comment' && previous.standalone && previous.line === event.startLine - 1 && previous.text
        ? previous.text
        : undefined
    const trailing =
      next?.type === 'comment' && !next.standalone && next.line === event.endLine ? next.text : undefined

    const parameter: Parameter = {
      name,
      label: description ?? labelFromName(name),
      ...(description === undefined ? {} : { description }),
      group,
      type: typeOf(defaultValue),
      defaultValue,
      control: controlFor(defaultValue, trailing),
      line: event.startLine,
    }

    // OpenSCAD semantics: the last assignment wins but keeps the first one's position.
    const existing = byName.get(name)
    byName.set(name, existing ? { ...parameter, group: existing.group, line: existing.line } : parameter)
  })

  const parameters = [...byName.values()].filter((parameter) => parameter.group !== HIDDEN_GROUP)
  const groups: ParameterGroup[] = []
  for (const parameter of parameters) {
    let target = groups.find((candidate) => candidate.name === parameter.group)
    if (!target) {
      target = { name: parameter.group, parameters: [] }
      groups.push(target)
    }
    target.parameters.push(parameter)
  }
  return { groups, parameters }
}
