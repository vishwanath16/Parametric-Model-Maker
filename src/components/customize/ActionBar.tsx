import { RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import { selectValues, useAppStore } from '../../store/appStore'
import { firstError } from '../../store/values'

const ICON_BUTTON = 'flex h-9 w-9 shrink-0 items-center justify-center rounded hover:bg-line'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Pinned to the bottom of the sidebar: auto-regenerate, reset and Generate. */
export function ActionBar() {
  const autoRegenerate = useAppStore((state) => state.autoRegenerate)
  const running = useAppStore((state) => state.render.status === 'running')
  const error = useAppStore((state) => firstError(state.parsed, selectValues(state)))
  const setAutoRegenerate = useAppStore((state) => state.setAutoRegenerate)
  const resetValues = useAppStore((state) => state.resetValues)
  const generate = useAppStore((state) => state.generate)

  return (
    <div className="flex flex-col gap-2 border-t border-line bg-card p-3">
      {error && (
        <p role="alert" className="text-xs text-danger">
          Fix before generating: {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAutoRegenerate(!autoRegenerate)}
          aria-label="Auto-regenerate"
          aria-pressed={autoRegenerate}
          title={autoRegenerate ? 'Auto-regenerate is on' : 'Auto-regenerate is off'}
          className={`${ICON_BUTTON} ${autoRegenerate ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-raised'}`}
        >
          <RefreshCw size={16} aria-hidden />
        </button>
        <button
          type="button"
          onClick={resetValues}
          aria-label="Reset"
          title="Reset parameters to defaults"
          className={`${ICON_BUTTON} bg-raised`}
        >
          <RotateCcw size={16} aria-hidden />
        </button>
        <button
          type="button"
          onClick={generate}
          disabled={error !== null}
          title={`Generate (${IS_MAC ? '⌘' : 'Ctrl'}+Enter)`}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded bg-primary font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles size={16} aria-hidden />
          {running ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
