import { lazy, Suspense, useEffect } from 'react'
import { Landing } from './components/landing/Landing'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { Viewport } from './components/viewport/Viewport'
import { useAppStore, warmUpRenderer } from './store/appStore'
import { startSession } from './store/session'

// CodeMirror is only downloaded when the code editor is first opened.
const CodeDrawer = lazy(() => import('./components/editor/CodeDrawer'))

function Editor() {
  const codeOpen = useAppStore((state) => state.codeOpen)
  const closeProject = useAppStore((state) => state.closeProject)

  return (
    <div className="flex h-full flex-col">
      <Header onBack={closeProject} />
      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <Sidebar />
        <main className="relative min-h-0 min-w-0 flex-1">
          <Viewport />
          {codeOpen && (
            <Suspense fallback={<p className="absolute left-4 top-4 rounded bg-card px-3 py-2">Loading editor…</p>}>
              <CodeDrawer />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  )
}

export function App() {
  const hydrated = useAppStore((state) => state.hydrated)
  const hasProject = useAppStore((state) => state.project !== null)

  useEffect(() => startSession(), [])
  useEffect(() => warmUpRenderer(), [])

  // Ctrl/Cmd+Enter generates from anywhere; the code editor handles it itself (and saves first).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || event.defaultPrevented) return
      event.preventDefault()
      useAppStore.getState().generate()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!hydrated) return null
  return <ErrorBoundary>{hasProject ? <Editor /> : <Landing />}</ErrorBoundary>
}
