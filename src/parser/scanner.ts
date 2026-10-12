/**
 * First pass over a .scad file: walks the top level only, tracking strings, comments
 * and bracket depth, and reports what the Customizer cares about. Scanning stops at
 * the first `module` or `function`, because nothing after it is a parameter.
 */
export type TopLevelEvent =
  /** A `/* [Name] *\/` block comment between statements. */
  | { type: 'group'; name: string; line: number }
  /** A `//` comment between statements. `standalone` means nothing precedes it on its line. */
  | { type: 'comment'; text: string; line: number; standalone: boolean }
  /** A `;`-terminated top-level statement with comments removed. */
  | { type: 'statement'; text: string; startLine: number; endLine: number }

const GROUP_COMMENT = /^\/\*\s*\[([^\]]*)\]\s*\*\/$/
const IDENTIFIER = /[A-Za-z_$][A-Za-z0-9_$]*/y
const WHITESPACE = /\s/

function countNewlines(text: string): number {
  let count = 0
  for (const char of text) if (char === '\n') count++
  return count
}

/** Returns the index just past the string literal that starts at `start`. */
function endOfString(source: string, start: number): number {
  let i = start + 1
  while (i < source.length) {
    const char = source[i]
    if (char === '\\') i += 2
    else if (char === '"') return i + 1
    else i++
  }
  return source.length
}

export function scanTopLevel(source: string): TopLevelEvent[] {
  const events: TopLevelEvent[] = []
  const length = source.length
  let i = source.startsWith('﻿') ? 1 : 0
  let line = 1
  let lineHasContent = false
  let inStatement = false
  let statement = ''
  let startLine = 0
  let depth = 0 // () and []
  let braces = 0

  while (i < length) {
    const char = source[i] as string

    if (char === '\n') {
      line++
      lineHasContent = false
      if (inStatement) statement += char
      i++
      continue
    }
    if (WHITESPACE.test(char)) {
      if (inStatement) statement += ' '
      i++
      continue
    }

    if (source.startsWith('//', i)) {
      const newline = source.indexOf('\n', i)
      const end = newline === -1 ? length : newline
      if (!inStatement) {
        events.push({ type: 'comment', text: source.slice(i + 2, end).trim(), line, standalone: !lineHasContent })
      }
      i = end
      continue
    }

    if (source.startsWith('/*', i)) {
      const close = source.indexOf('*/', i + 2)
      const end = close === -1 ? length : close + 2
      const raw = source.slice(i, end)
      if (!inStatement) {
        const match = GROUP_COMMENT.exec(raw)
        if (match?.[1] !== undefined) events.push({ type: 'group', name: match[1].trim(), line })
      }
      line += countNewlines(raw)
      lineHasContent = true
      i = end
      continue
    }

    lineHasContent = true

    if (!inStatement) {
      IDENTIFIER.lastIndex = i
      const word = IDENTIFIER.exec(source)?.[0]
      if (word === 'module' || word === 'function') return events
      if (word === 'use' || word === 'include') {
        // `use <file>` and `include <file>` have no terminating semicolon.
        let next = i + word.length
        while (next < length && WHITESPACE.test(source[next] as string)) next++
        if (source[next] === '<') {
          const close = source.indexOf('>', next)
          const end = close === -1 ? length : close + 1
          line += countNewlines(source.slice(i, end))
          i = end
          continue
        }
      }
      inStatement = true
      statement = ''
      startLine = line
      depth = 0
      braces = 0
    }

    if (char === '"') {
      const end = endOfString(source, i)
      const raw = source.slice(i, end)
      statement += raw
      line += countNewlines(raw)
      i = end
      continue
    }

    if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1)
    else if (char === '{') braces++
    else if (char === '}') {
      braces = Math.max(0, braces - 1)
      if (braces === 0 && depth === 0) {
        // End of a block such as `if (...) { ... }`: never an assignment, so drop it.
        inStatement = false
        i++
        continue
      }
    } else if (char === ';' && depth === 0 && braces === 0) {
      events.push({ type: 'statement', text: statement.trim(), startLine, endLine: line })
      inStatement = false
      i++
      continue
    }

    statement += char
    i++
  }

  return events
}
