import { Box } from 'lucide-react'
import { scadPaths } from '../../lib/files'
import { useAppStore } from '../../store/appStore'

const FIELD = 'rounded border border-line bg-field px-3 placeholder:text-muted/60 focus:border-primary focus:outline-none'

export function ModelCard() {
  const project = useAppStore((state) => state.project)
  const setMeta = useAppStore((state) => state.setMeta)
  const setActivePath = useAppStore((state) => state.setActivePath)
  if (!project) return null

  const paths = scadPaths(project.files)
  const fileCount = Object.keys(project.files).length

  return (
    <section className="rounded-lg bg-card" aria-labelledby="model-heading">
      <h2 id="model-heading" className="flex items-center gap-3 border-b border-line px-4 py-4 text-base font-medium">
        <Box size={20} aria-hidden />
        Model
      </h2>
      <div className="flex flex-col gap-3 p-4">
        <p className="truncate font-mono text-xs text-muted" title={project.activePath}>
          {project.activePath}
          {fileCount > 1 && ` · ${fileCount} files uploaded`}
        </p>
        <input
          type="text"
          aria-label="Title"
          value={project.title}
          onChange={(event) => setMeta({ title: event.target.value })}
          placeholder="Title"
          className={`${FIELD} h-9 font-medium`}
        />
        <textarea
          aria-label="Description"
          value={project.description}
          onChange={(event) => setMeta({ description: event.target.value })}
          placeholder="Description (optional)"
          rows={2}
          className={`${FIELD} resize-y py-2`}
        />
        <label className="flex h-9 items-center rounded border border-line bg-field pl-3 focus-within:border-primary">
          <span className="shrink-0 border-r border-line pr-3 text-[13px]">Customizable List</span>
          <select
            value={project.activePath}
            onChange={(event) => setActivePath(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] focus:outline-none"
          >
            {paths.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
