import { Grid3x3, Maximize, SquareTerminal } from 'lucide-react'
import type { ViewPreset } from '../../viewer/ViewerScene'
import { CUSTOM_PLATE_ID, PLATE_PRESETS, type PlateSize } from '../../viewer/plates'
import { useViewerStore } from '../../store/viewerStore'

const VIEWS: readonly { id: ViewPreset; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'iso', label: 'Iso' },
]

const CUSTOM_AXES: readonly { axis: keyof PlateSize; label: string }[] = [
  { axis: 'x', label: 'Plate width (X) in mm' },
  { axis: 'y', label: 'Plate depth (Y) in mm' },
  { axis: 'z', label: 'Max height (Z) in mm' },
]

const MAX_PLATE_MM = 2000
const ICON_BUTTON = 'flex h-7 w-7 items-center justify-center rounded hover:bg-raised'

interface ViewportToolbarProps {
  onView: (preset: ViewPreset) => void
  onFit: () => void
  consoleOpen: boolean
  onToggleConsole: () => void
}

export function ViewportToolbar({ onView, onFit, consoleOpen, onToggleConsole }: ViewportToolbarProps) {
  const plateId = useViewerStore((state) => state.plateId)
  const customPlate = useViewerStore((state) => state.customPlate)
  const showGrid = useViewerStore((state) => state.showGrid)
  const hasModel = useViewerStore((state) => state.dimensions !== null)
  const setPlateId = useViewerStore((state) => state.setPlateId)
  const setCustomPlate = useViewerStore((state) => state.setCustomPlate)
  const toggleGrid = useViewerStore((state) => state.toggleGrid)

  return (
    <div className="absolute bottom-4 right-4 flex max-w-[calc(100%-2rem)] flex-col items-end gap-2 text-[13px]">
      {plateId === CUSTOM_PLATE_ID && (
        <div className="flex items-center gap-1.5 rounded bg-card p-1.5">
          {CUSTOM_AXES.map(({ axis, label }) => (
            <input
              key={axis}
              type="number"
              aria-label={label}
              title={label}
              min={1}
              max={MAX_PLATE_MM}
              value={customPlate[axis]}
              onChange={(event) => {
                const value = event.target.valueAsNumber
                if (Number.isFinite(value) && value >= 1 && value <= MAX_PLATE_MM) setCustomPlate({ [axis]: value })
              }}
              className="h-7 w-16 rounded border border-line bg-field px-2"
            />
          ))}
          <span className="pr-1 text-muted">mm</span>
        </div>
      )}

      <div role="toolbar" aria-label="Viewport" className="flex flex-wrap items-center justify-end gap-1 rounded bg-card p-1.5">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onView(view.id)}
            aria-label={`${view.label} view`}
            className="h-7 rounded px-2 hover:bg-raised"
          >
            {view.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onFit}
          disabled={!hasModel}
          aria-label="Zoom to model"
          title="Zoom to model"
          className={`${ICON_BUTTON} disabled:opacity-40`}
        >
          <Maximize size={16} aria-hidden />
        </button>
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <button
          type="button"
          onClick={toggleGrid}
          aria-label="Toggle grid"
          aria-pressed={showGrid}
          title="Toggle grid"
          className={`${ICON_BUTTON} ${showGrid ? 'bg-raised' : 'text-muted'}`}
        >
          <Grid3x3 size={16} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onToggleConsole}
          aria-label="Toggle OpenSCAD console"
          aria-pressed={consoleOpen}
          title="OpenSCAD console"
          className={`${ICON_BUTTON} ${consoleOpen ? 'bg-raised' : 'text-muted'}`}
        >
          <SquareTerminal size={16} aria-hidden />
        </button>
        <select
          aria-label="Build plate size"
          value={plateId}
          onChange={(event) => setPlateId(event.target.value)}
          className="h-7 rounded bg-transparent px-1 hover:bg-raised"
        >
          {PLATE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value={CUSTOM_PLATE_ID}>Custom…</option>
        </select>
      </div>
    </div>
  )
}
