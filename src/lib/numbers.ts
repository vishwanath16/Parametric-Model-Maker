const MAX_DECIMALS = 10

/** Number of digits after the decimal point in a number's shortest representation. */
export function decimalsOf(value: number): number {
  if (!Number.isFinite(value)) return 0
  const text = String(value)
  const exponent = /e-(\d+)$/.exec(text)
  if (exponent?.[1] !== undefined) return Math.min(Number(exponent[1]), MAX_DECIMALS)
  const point = text.indexOf('.')
  return point === -1 ? 0 : Math.min(text.length - point - 1, MAX_DECIMALS)
}

/** A sensible +/- step for values written with the same precision as `samples`. */
export function inferStep(...samples: number[]): number {
  const decimals = Math.min(Math.max(0, ...samples.map(decimalsOf)), 4)
  return 10 ** -decimals
}

/**
 * Moves `value` by one step up (+1) or down (-1), clamps it to the limits, and rounds
 * away floating-point noise such as 0.1 + 0.2 = 0.30000000000000004.
 */
export function stepNumber(value: number, step: number, direction: 1 | -1, min?: number, max?: number): number {
  const start = Number.isFinite(value) ? value : (min ?? 0)
  const decimals = Math.max(decimalsOf(start), decimalsOf(step))
  let next = Number((start + direction * step).toFixed(decimals))
  if (min !== undefined) next = Math.max(next, min)
  if (max !== undefined) next = Math.min(next, max)
  return next
}
