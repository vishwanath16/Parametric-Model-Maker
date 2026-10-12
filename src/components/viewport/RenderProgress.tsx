import { useEffect, useState } from 'react'
import type { RenderStage } from '../../openscad/protocol'
import { useAppStore } from '../../store/appStore'

const STAGES: readonly { id: RenderStage; label: string }[] = [
  { id: 'loading-wasm', label: 'Loading OpenSCAD' },
  { id: 'loading-assets', label: 'Loading libraries and fonts' },
  { id: 'rendering', label: 'Rendering model' },
]

/** Spinner, current stage and elapsed time while a render is running, with a Cancel button. */
export function RenderProgress() {
  const running = useAppStore((state) => state.render.status === 'running')
  const stage = useAppStore((state) => state.render.stage)
  const startedAt = useAppStore((state) => state.render.startedAt)
  const cancelRender = useAppStore((state) => state.cancelRender)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [running, startedAt])

  if (!running) return null

  const stageIndex = Math.max(
    0,
    STAGES.findIndex((candidate) => candidate.id === stage),
  )
  const seconds = Math.max(0, (now - startedAt) / 1000)

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute right-4 top-16 z-20 flex w-[min(360px,calc(100%-2rem))] flex-col gap-2 rounded-lg bg-card p-3 shadow-lg"
    >
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {STAGES[stageIndex]?.label}… <span className="tabular-nums text-muted">{seconds.toFixed(1)}s</span>
        </span>
        <button type="button" onClick={cancelRender} className="h-7 rounded bg-raised px-2.5 text-[13px] hover:bg-line">
          Cancel
        </button>
      </div>
      {/* OpenSCAD reports no percentage, so progress is shown as completed stages. */}
      <div className="flex gap-1" aria-hidden>
        {STAGES.map((candidate, index) => (
          <span
            key={candidate.id}
            className={`h-1 flex-1 rounded-full ${
              index < stageIndex ? 'bg-primary' : index === stageIndex ? 'animate-pulse bg-primary' : 'bg-line'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
