import { TriangleAlert } from 'lucide-react'
import { selectIsStale, useAppStore } from '../../store/appStore'
import { selectPlateSize, useViewerStore } from '../../store/viewerStore'

const LARGE_MODEL_TRIANGLES = 1_500_000

const format = (mm: number): string => mm.toFixed(2).replace(/\.?0+$/, '')

const WARNING = 'flex items-center gap-2 self-start rounded bg-card px-3 py-1.5 text-warn'

export function DimensionsBadge() {
  const dimensions = useViewerStore((state) => state.dimensions)
  const plateId = useViewerStore((state) => state.plateId)
  const customPlate = useViewerStore((state) => state.customPlate)
  const triangles = useAppStore((state) => state.render.triangles)
  const durationMs = useAppStore((state) => state.render.durationMs)
  const stale = useAppStore(selectIsStale)
  if (!dimensions) return null

  const plate = selectPlateSize({ plateId, customPlate })
  const exceeds = dimensions.x > plate.x || dimensions.y > plate.y || dimensions.z > plate.z

  return (
    <div className="absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] flex-col gap-1.5 text-[13px]">
      {triangles > LARGE_MODEL_TRIANGLES && (
        <p role="status" className={WARNING}>
          <TriangleAlert size={15} aria-hidden className="shrink-0" />
          Very large model. Viewing and exporting may be slow; try Preview quality.
        </p>
      )}
      {exceeds && (
        <p role="alert" className={WARNING}>
          <TriangleAlert size={15} aria-hidden className="shrink-0" />
          Model exceeds the {plate.x} × {plate.y} × {plate.z} mm build volume
        </p>
      )}
      {stale && (
        <p role="status" className="self-start rounded bg-card px-3 py-1.5 text-muted">
          Parameters changed. Generate to update the model.
        </p>
      )}
      <p className="self-start rounded bg-card px-3 py-1.5 tabular-nums">
        <span data-testid="dimensions">
          {format(dimensions.x)} × {format(dimensions.y)} × {format(dimensions.z)} mm
        </span>
        <span className="text-muted">
          {' '}
          · {triangles.toLocaleString()} triangles · {(durationMs / 1000).toFixed(1)}s
        </span>
      </p>
    </div>
  )
}
