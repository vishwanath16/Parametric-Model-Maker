import { useRef, useState, type DragEvent } from 'react'
import { ArrowRight, FileUp } from 'lucide-react'
import { EXAMPLES } from '../../examples'
import { readUploads } from '../../lib/files'
import { useAppStore } from '../../store/appStore'
import { Header } from '../layout/Header'

export function Landing() {
  const openProject = useAppStore((state) => state.openProject)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = async (uploads: readonly File[]): Promise<void> => {
    if (uploads.length === 0) return
    setBusy(true)
    setError(null)
    try {
      openProject(await readUploads(uploads))
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem))
      setBusy(false)
    }
  }

  const handleDrop = (event: DragEvent): void => {
    event.preventDefault()
    setDragging(false)
    void open([...event.dataTransfer.files])
  }

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 py-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          <div>
            <h2 className="text-2xl font-semibold">Customize an OpenSCAD model</h2>
            <p className="mt-2 text-muted">
              Upload a .scad file to turn its Customizer variables into a form, render it in your browser and export
              an STL. Nothing is uploaded to a server.
            </p>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragging ? 'border-primary bg-primary/10' : 'border-line bg-card'
            }`}
          >
            <FileUp size={36} aria-hidden className="text-muted" />
            <div>
              <p className="text-base font-medium">Drop your .scad file here</p>
              <p className="mt-1 text-muted">
                Add the files it uses or includes, a preset .json, or drop everything as one .zip.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className="h-10 rounded bg-primary px-5 font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {busy ? 'Opening…' : 'Choose files'}
            </button>
            <input
              ref={fileInput}
              type="file"
              multiple
              aria-label="Upload OpenSCAD files"
              accept=".scad,.zip,.json,.stl,.svg,.dxf,.csv,.txt,.dat"
              onChange={(event) => {
                void open([...(event.target.files ?? [])])
                event.target.value = ''
              }}
              className="hidden"
            />
            {error && (
              <p role="alert" className="text-danger">
                {error}
              </p>
            )}
          </div>

          <section aria-labelledby="examples-heading">
            <h2 id="examples-heading" className="mb-3 text-base font-medium">
              Or start from an example
            </h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {EXAMPLES.map((example) => (
                <li key={example.id}>
                  <button
                    type="button"
                    onClick={() => openProject(example.files, example.title)}
                    className="group flex h-full w-full flex-col gap-2 rounded-lg bg-card p-4 text-left hover:bg-raised"
                  >
                    <span className="flex items-start justify-between gap-2 font-medium">
                      {example.title}
                      <ArrowRight size={16} aria-hidden className="mt-0.5 shrink-0 text-muted group-hover:text-ink" />
                    </span>
                    <span className="text-[13px] text-muted">{example.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
