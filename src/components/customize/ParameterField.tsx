import { useId } from 'react'
import { validateValue, validateVector, type Parameter, type ParamValue } from '../../parser'
import { inferStep } from '../../lib/numbers'
import { selectValues, useAppStore } from '../../store/appStore'
import { NumberInput } from './NumberInput'

const FIELD = 'h-9 w-full rounded border bg-field px-3 font-medium focus:border-primary focus:outline-none'
const VECTOR_AXES = ['X', 'Y', 'Z']

interface ControlProps {
  parameter: Parameter
  value: ParamValue
  onChange: (value: ParamValue) => void
  id: string
  error: string | null
  errorId: string
}

function Control({ parameter, value, onChange, id, error, errorId }: ControlProps) {
  const { control, label } = parameter
  const invalid = error !== null
  const describedBy = invalid ? errorId : undefined
  const border = invalid ? 'border-danger' : 'border-line'
  const numeric = typeof value === 'number' ? value : Number.NaN
  const defaultNumber = typeof parameter.defaultValue === 'number' ? parameter.defaultValue : 0

  switch (control.kind) {
    case 'toggle':
      return null // Rendered inline with the label by ParameterField.

    case 'number':
      return (
        <NumberInput
          id={id}
          label={label}
          labelled
          value={numeric}
          onChange={onChange}
          step={control.step ?? inferStep(defaultNumber)}
          invalid={invalid}
          describedBy={describedBy}
        />
      )

    case 'slider': {
      const step = control.step ?? inferStep(control.min, control.max, defaultNumber)
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            aria-label={`${label} slider`}
            min={control.min}
            max={control.max}
            step={step}
            value={Number.isFinite(numeric) ? numeric : control.min}
            onChange={(event) => onChange(event.target.valueAsNumber)}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
          />
          <div className="w-32 shrink-0">
            <NumberInput
              id={id}
              label={label}
              labelled
              value={numeric}
              onChange={onChange}
              step={step}
              min={control.min}
              max={control.max}
              invalid={invalid}
              describedBy={describedBy}
            />
          </div>
        </div>
      )
    }

    case 'dropdown': {
      const selected = control.options.findIndex((option) => option.value === value)
      return (
        <select
          id={id}
          value={selected}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => {
            const option = control.options[Number(event.target.value)]
            if (option) onChange(option.value)
          }}
          className={`${FIELD} ${border}`}
        >
          {selected === -1 && (
            <option value={-1} disabled>
              {String(value)} (not an option)
            </option>
          )}
          {control.options.map((option, index) => (
            <option key={index} value={index}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    case 'text':
      return (
        <input
          id={id}
          type="text"
          value={typeof value === 'string' ? value : ''}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className={`${FIELD} ${border}`}
        />
      )

    case 'vector': {
      const elements = Array.isArray(value) ? value : []
      const defaults = Array.isArray(parameter.defaultValue) ? parameter.defaultValue : []
      const elementErrors = validateVector(parameter, value)
      const step = control.step ?? inferStep(...defaults, ...(control.min === undefined ? [] : [control.min]))
      const columns = defaults.length <= 3 ? defaults.length : 2
      return (
        <div
          role="group"
          aria-label={label}
          aria-describedby={describedBy}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {defaults.map((_, index) => (
            <NumberInput
              key={index}
              id={index === 0 ? id : undefined}
              label={`${label} ${defaults.length <= 3 ? VECTOR_AXES[index] : index + 1}`}
              value={elements[index] ?? Number.NaN}
              onChange={(next) => onChange(defaults.map((fallback, i) => (i === index ? next : (elements[i] ?? fallback))))}
              step={step}
              min={control.min}
              max={control.max}
              invalid={elementErrors[index] != null}
            />
          ))}
        </div>
      )
    }
  }
}

export function ParameterField({ parameter }: { parameter: Parameter }) {
  const id = useId()
  const errorId = `${id}-error`
  const value = useAppStore((state) => selectValues(state)[parameter.name]) ?? parameter.defaultValue
  const setValue = useAppStore((state) => state.setValue)
  const error = validateValue(parameter, value)
  const onChange = (next: ParamValue): void => setValue(parameter.name, next)
  const tooltip = parameter.description ? `${parameter.description} (${parameter.name})` : parameter.name

  if (parameter.control.kind === 'toggle') {
    const checked = value === true
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <label htmlFor={id} title={tooltip} className="text-muted">
          {parameter.label}
        </label>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-line'}`}
        >
          <span
            aria-hidden
            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              checked ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} title={tooltip} className="text-muted">
        {parameter.label}
      </label>
      <Control parameter={parameter} value={value} onChange={onChange} id={id} error={error} errorId={errorId} />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
