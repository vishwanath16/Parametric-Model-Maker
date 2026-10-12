import type { ParamValue } from './types'

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  n: '\n',
  t: '\t',
  r: '\r',
  '"': '"',
  '\\': '\\',
}

/** Parses a numeric literal, or returns undefined if the text is anything else. */
export function parseNumber(text: string): number | undefined {
  const trimmed = text.trim()
  if (!NUMBER.test(trimmed)) return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}

/** Decodes a complete `"..."` literal, or returns undefined if the text is not exactly one string. */
function parseString(text: string): string | undefined {
  if (!text.startsWith('"')) return undefined
  let result = ''
  let i = 1
  while (i < text.length) {
    const char = text[i] as string
    if (char === '"') return i === text.length - 1 ? result : undefined
    if (char !== '\\') {
      result += char
      i++
      continue
    }
    const next = text[i + 1]
    if (next === undefined) return undefined
    const hexLength = next === 'x' ? 2 : next === 'u' ? 4 : next === 'U' ? 6 : 0
    if (hexLength > 0) {
      const hex = text.slice(i + 2, i + 2 + hexLength)
      if (hex.length !== hexLength || !/^[0-9a-fA-F]+$/.test(hex)) return undefined
      const codePoint = parseInt(hex, 16)
      if (codePoint > 0x10ffff) return undefined
      result += String.fromCodePoint(codePoint)
      i += 2 + hexLength
    } else {
      result += SIMPLE_ESCAPES[next] ?? next
      i += 2
    }
  }
  return undefined
}

/** Parses `[1, 2, 3]`. Ranges, nested vectors, non-numbers and empty vectors are rejected. */
function parseVector(text: string): number[] | undefined {
  if (!text.startsWith('[') || !text.endsWith(']')) return undefined
  const parts = text.slice(1, -1).split(',')
  if (parts.length > 1 && parts[parts.length - 1]?.trim() === '') parts.pop() // trailing comma
  const values: number[] = []
  for (const part of parts) {
    const value = parseNumber(part)
    if (value === undefined) return undefined
    values.push(value)
  }
  return values.length > 0 ? values : undefined
}

/**
 * Parses the right-hand side of an assignment. Returns undefined for anything that is
 * not a plain literal (expressions, references to other variables, `undef`, ranges).
 */
export function parseLiteral(text: string): ParamValue | undefined {
  const trimmed = text.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  return parseNumber(trimmed) ?? parseString(trimmed) ?? parseVector(trimmed)
}
