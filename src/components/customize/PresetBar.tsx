import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { downloadFile } from '../../lib/download'
import { companionPresetPath, stem } from '../../lib/files'
import {
  parsePresetFile,
  presetToValues,
  serializePresetFile,
  valuesToPreset,
  type PresetSets,
} from '../../lib/presets'
import { selectValues, useAppStore } from '../../store/appStore'

const BUTTON = 'flex h-8 shrink-0 items-center gap-1.5 rounded bg-raised px-2.5 text-[13px] hover:bg-line'

export function PresetBar() {
  const activePath = useAppStore((state) => state.project?.activePath ?? '')
  const presetPath = companionPresetPath(activePath)
  const presetFile = useAppStore((state) => state.project?.files[presetPath])
  const parameters = useAppStore((state) => state.parsed.parameters)
  const applyValues = useAppStore((state) => state.applyValues)
  const setFile = useAppStore((state) => state.setFile)

  const fileInput = useRef<HTMLInputElement>(null)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const sets = useMemo<PresetSets>(() => {
    if (typeof presetFile !== 'string') return {}
    try {
      return parsePresetFile(presetFile)
    } catch {
      return {}
    }
  }, [presetFile])
  const names = Object.keys(sets)

  const apply = (presetName: string): void => {
    const set = sets[presetName]
    if (!set) return
    applyValues(presetToValues(parameters, set))
    setMessage({ text: `Applied "${presetName}"`, error: false })
  }

  const save = (event: FormEvent): void => {
    event.preventDefault()
    const presetName = name.trim()
    if (!presetName) return
    const next = { ...sets, [presetName]: valuesToPreset(parameters, selectValues(useAppStore.getState())) }
    const json = serializePresetFile(next)
    setFile(presetPath, json)
    downloadFile(json, `${stem(activePath)}.json`, 'application/json')
    setNaming(false)
    setName('')
    setMessage({ text: `Saved "${presetName}" and downloaded ${stem(activePath)}.json`, error: false })
  }

  const load = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const loaded = parsePresetFile(await file.text())
      const [first] = Object.keys(loaded)
      if (first === undefined) throw new Error('The preset file contains no presets.')
      setFile(presetPath, serializePresetFile({ ...sets, ...loaded }))
      applyValues(presetToValues(parameters, loaded[first] ?? {}))
      setMessage({ text: `Loaded ${Object.keys(loaded).length} preset(s) and applied "${first}"`, error: false })
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : String(error), error: true })
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-line py-3">
      <div className="flex items-center gap-2">
        <select
          aria-label="Apply preset"
          value=""
          disabled={names.length === 0}
          onChange={(event) => apply(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded border border-line bg-field px-2 text-[13px] disabled:text-muted"
        >
          <option value="" disabled>
            {names.length === 0 ? 'No presets yet' : `Apply preset… (${names.length})`}
          </option>
          {names.map((presetName) => (
            <option key={presetName} value={presetName}>
              {presetName}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setNaming((open) => !open)} aria-expanded={naming} className={BUTTON}>
          <Download size={14} aria-hidden />
          Save preset
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={BUTTON}>
          <Upload size={14} aria-hidden />
          Load
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="Load preset file"
          onChange={(event) => void load(event)}
          className="hidden"
        />
      </div>

      {naming && (
        <form onSubmit={save} className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            aria-label="Preset name"
            placeholder="Preset name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded border border-line bg-field px-2 text-[13px] focus:border-primary focus:outline-none"
          />
          <button type="submit" disabled={!name.trim()} className={`${BUTTON} disabled:opacity-50`}>
            Save
          </button>
        </form>
      )}

      {message && (
        <p role="status" className={`text-xs ${message.error ? 'text-danger' : 'text-muted'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
