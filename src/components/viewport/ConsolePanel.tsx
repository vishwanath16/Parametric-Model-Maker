import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useViewerStore } from '../../store/viewerStore'

interface ConsolePanelProps {
  /** Whether the user asked to see the console; errors show it regardless. */
  open: boolean
  onClose: () => void
}

/** Error panel with OpenSCAD's console output. Also shows the console on request after a good render. */
export function ConsolePanel({ open, onClose }: ConsolePanelProps) {
  const status = useAppStore((state) => state.render.status)
  const errorMessage = useAppStore((state) => state.render.errorMessage)
  const log = useAppStore((state) => state.render.log)
  const startedAt = useAppStore((state) => state.render.startedAt)
  const viewerError = useViewerStore((state) => state.viewerError)
  const [dismissed, setDismissed] = useState(false)

  // A dismissed error stays hidden only until the next render attempt.
  useEffect(() => setDismissed(false), [startedAt, viewerError])

  const failed = status === 'error'
  const message = dismissed ? null : failed ? errorMessage : viewerError
  if (!open && !message) return null

  const close = (): void => {
    setDismissed(true)
    onClose()
  }

  return (
    <section
      role={message ? 'alert' : 'region'}
      aria-label="OpenSCAD console"
      className={`absolute left-4 right-4 top-36 z-20 flex max-h-[50%] flex-col rounded-lg border bg-card shadow-lg md:left-auto md:w-[460px] ${
        message ? 'border-danger/60' : 'border-line'
      }`}
    >
      <div className="flex items-start gap-3 border-b border-line p-3">
        <div className="min-w-0 flex-1">
          <h2 className={`font-semibold ${message ? 'text-danger' : ''}`}>
            {message ? (failed ? 'Render failed' : 'Viewer problem') : 'OpenSCAD console'}
          </h2>
          {message && <p className="mt-1 text-[13px]">{message}</p>}
        </div>
        <button type="button" onClick={close} aria-label="Close console" className="rounded p-1 hover:bg-raised">
          <X size={16} aria-hidden />
        </button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs text-muted">
        {log.length > 0 ? log.join('\n') : 'No console output.'}
      </pre>
    </section>
  )
}
