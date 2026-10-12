import { useState, type KeyboardEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { stepNumber } from '../../lib/numbers'

interface NumberInputProps {
  id?: string
  /** Accessible name; also used to name the +/- buttons. */
  label: string
  /** NaN means "not a valid number yet"; the typed text is kept so it can be corrected. */
  value: number
  onChange: (value: number) => void
  step: number
  min?: number
  max?: number
  invalid?: boolean
  describedBy?: string
  /** Hide the visible label association when a <label htmlFor> already names the input. */
  labelled?: boolean
}

const parseText = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text))
const formatValue = (value: number): string => (Number.isFinite(value) ? String(value) : '')

const STEP_BUTTON =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-line text-muted hover:border-muted hover:text-ink'

export function NumberInput(props: NumberInputProps) {
  const { id, label, value, onChange, step, min, max, invalid = false, describedBy, labelled = false } = props
  const [text, setText] = useState(() => formatValue(value))
  // Show the typed text while it still means `value` (so "1." or "-" survive); otherwise
  // the value was changed from outside (reset, preset, slider, +/-) and wins.
  const shown = Object.is(parseText(text), value) ? text : formatValue(value)

  const nudge = (direction: 1 | -1): void => onChange(stepNumber(value, step, direction, min, max))

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    nudge(event.key === 'ArrowUp' ? 1 : -1)
  }

  return (
    <div
      className={`flex h-9 min-w-0 items-center gap-1.5 rounded border bg-field pr-2 focus-within:border-primary ${
        invalid ? 'border-danger' : 'border-line'
      }`}
    >
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={shown}
        aria-label={labelled ? undefined : label}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(event) => {
          setText(event.target.value)
          onChange(parseText(event.target.value))
        }}
        onKeyDown={handleKeyDown}
        className="h-full min-w-0 flex-1 bg-transparent pl-3 font-medium tabular-nums outline-none"
      />
      <button type="button" tabIndex={-1} aria-label={`Decrease ${label}`} onClick={() => nudge(-1)} className={STEP_BUTTON}>
        <Minus size={12} aria-hidden />
      </button>
      <button type="button" tabIndex={-1} aria-label={`Increase ${label}`} onClick={() => nudge(1)} className={STEP_BUTTON}>
        <Plus size={12} aria-hidden />
      </button>
    </div>
  )
}
