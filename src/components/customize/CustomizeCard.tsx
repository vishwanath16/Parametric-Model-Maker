import { History, SlidersHorizontal } from 'lucide-react'
import type { Quality } from '../../openscad/defines'
import { useAppStore } from '../../store/appStore'
import { Accordion } from '../layout/Accordion'
import { ParameterField } from './ParameterField'
import { PresetBar } from './PresetBar'

const QUALITIES: readonly { id: Quality; label: string; hint: string }[] = [
  { id: 'preview', label: 'Preview', hint: 'Faster: caps $fn at 24 where the file sets it' },
  { id: 'render', label: 'Render', hint: 'Full quality, as written in the file' },
]

export function CustomizeCard() {
  const groups = useAppStore((state) => state.parsed.groups)
  const activePath = useAppStore((state) => state.project?.activePath ?? '')
  const quality = useAppStore((state) => state.quality)
  const setQuality = useAppStore((state) => state.setQuality)
  const setCodeOpen = useAppStore((state) => state.setCodeOpen)
  const resetValues = useAppStore((state) => state.resetValues)

  return (
    <section className="rounded-lg bg-card" aria-labelledby="customize-heading">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <SlidersHorizontal size={20} aria-hidden />
        <h2 id="customize-heading" className="flex-1 text-base font-medium">
          Customize
        </h2>
        <button
          type="button"
          onClick={() => setCodeOpen(true)}
          className="h-8 rounded bg-raised px-3 font-medium hover:bg-line"
        >
          Code
        </button>
        <button
          type="button"
          onClick={resetValues}
          aria-label="Reset to defaults"
          title="Reset to defaults"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-raised hover:bg-line"
        >
          <History size={16} aria-hidden />
        </button>
      </div>

      <div className="px-4">
        <PresetBar />

        <div className="flex items-center justify-between gap-3 border-b border-line py-3">
          <span id="quality-label" className="text-muted">
            Quality
          </span>
          <div role="radiogroup" aria-labelledby="quality-label" className="flex rounded bg-field p-0.5">
            {QUALITIES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={quality === option.id}
                title={option.hint}
                onClick={() => setQuality(option.id)}
                className={`h-7 rounded px-3 text-[13px] ${
                  quality === option.id ? 'bg-raised font-medium text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {groups.length === 0 && (
          <p className="py-6 text-muted">
            This file has no customizable parameters. Open <strong className="text-ink">Code</strong> to edit the
            source directly.
          </p>
        )}

        {groups.map((group, index) => (
          // Keyed by file so each file starts with its first group open.
          <Accordion key={`${activePath}:${group.name}`} title={group.name} defaultOpen={index === 0}>
            <div className="flex flex-col gap-4">
              {group.parameters.map((parameter) => (
                <ParameterField key={parameter.name} parameter={parameter} />
              ))}
            </div>
          </Accordion>
        ))}
      </div>
    </section>
  )
}
