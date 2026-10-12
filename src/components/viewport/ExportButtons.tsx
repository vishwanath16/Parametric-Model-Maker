import { useState } from 'react'
import { Download } from 'lucide-react'
import { downloadFile } from '../../lib/download'
import { stem } from '../../lib/files'
import { stlToThreeMf } from '../../lib/threemf'
import { selectIsStale, useAppStore } from '../../store/appStore'

export function ExportButtons() {
  const stl = useAppStore((state) => state.render.stl)
  const stale = useAppStore(selectIsStale)
  const name = useAppStore((state) => (state.project ? stem(state.project.activePath) : 'model'))
  const [error, setError] = useState<string | null>(null)

  const hint = !stl
    ? 'Generate the model first'
    : stale
      ? 'Exports the model shown, which is older than the current parameters'
      : undefined

  const exportThreeMf = (): void => {
    if (!stl) return
    try {
      downloadFile(stlToThreeMf(stl), `${name}.3mf`, 'model/3mf')
      setError(null)
    } catch {
      setError('The model is too large to convert to 3MF in the browser. Export STL instead.')
    }
  }

  return (
    <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!stl}
          title={hint}
          onClick={() => stl && downloadFile(stl, `${name}.stl`, 'model/stl')}
          className="flex h-9 items-center gap-2 rounded bg-primary px-3 font-medium text-white shadow hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} aria-hidden />
          Export STL
        </button>
        <button
          type="button"
          disabled={!stl}
          title={hint}
          onClick={exportThreeMf}
          className="h-9 rounded bg-card px-3 font-medium shadow hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50"
        >
          3MF
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-xs rounded bg-card px-3 py-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
