import { create } from 'zustand'
import { parseCustomizer, type ParamValue, type ParseResult } from '../parser'
import { pickEntry, requiredLibraries, stem, usesText, type FileContent, type ProjectFiles } from '../lib/files'
import { stlTriangleCount } from '../lib/stl'
import { RenderCancelled, RenderClient, RenderFailure } from '../openscad/client'
import { buildDefines, type Quality } from '../openscad/defines'
import type { RenderStage } from '../openscad/protocol'
import { carryOverValues, defaultValues, firstError, reconcileValues, type Values } from './values'

export interface Project {
  title: string
  description: string
  files: ProjectFiles
  /** The .scad file being customized and rendered. */
  activePath: string
}

export interface RenderInfo {
  status: 'idle' | 'running' | 'done' | 'error'
  stage: RenderStage | null
  /** Wall-clock start of the running render (ms since epoch). */
  startedAt: number
  durationMs: number
  /** OpenSCAD console output from the most recent render. */
  log: string[]
  errorMessage: string | null
  /** The most recent successful render; kept on screen while a later one runs or fails. */
  stl: ArrayBuffer | null
  triangles: number
  /** `revision` the current STL was rendered from, to tell when it is out of date. */
  renderedRevision: number | null
  /** `revision` of the most recent Generate, whether it is running, finished, failed or was cancelled. */
  requestedRevision: number | null
}

interface AppState {
  /** False until the saved session has been read from IndexedDB. */
  hydrated: boolean
  project: Project | null
  /** Customizer parameters of the active file. */
  parsed: ParseResult
  /** Parameter values per .scad path, so switching files keeps each file's edits. */
  values: Record<string, Values>
  /** Bumped whenever anything that affects the rendered model changes. */
  revision: number
  autoRegenerate: boolean
  quality: Quality
  codeOpen: boolean
  render: RenderInfo

  openProject: (files: ProjectFiles, title?: string) => void
  restoreProject: (project: Project, values: Record<string, Values>) => void
  closeProject: () => void
  setActivePath: (path: string) => void
  setMeta: (meta: Partial<Pick<Project, 'title' | 'description'>>) => void
  setValue: (name: string, value: ParamValue) => void
  applyValues: (values: Values) => void
  resetValues: () => void
  updateSource: (path: string, source: string) => void
  setFile: (path: string, content: FileContent) => void
  setAutoRegenerate: (enabled: boolean) => void
  setQuality: (quality: Quality) => void
  setCodeOpen: (open: boolean) => void
  setHydrated: () => void
  generate: () => void
  cancelRender: () => void
}

const EMPTY_PARSE: ParseResult = { groups: [], parameters: [] }

const IDLE_RENDER: RenderInfo = {
  status: 'idle',
  stage: null,
  startedAt: 0,
  durationMs: 0,
  log: [],
  errorMessage: null,
  stl: null,
  triangles: 0,
  renderedRevision: null,
  requestedRevision: null,
}

const client = new RenderClient()

function parseFile(files: ProjectFiles, path: string): ParseResult {
  const source = files[path]
  return typeof source === 'string' ? parseCustomizer(source) : EMPTY_PARSE
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  project: null,
  parsed: EMPTY_PARSE,
  values: {},
  revision: 0,
  autoRegenerate: false,
  quality: 'render',
  codeOpen: false,
  render: IDLE_RENDER,

  openProject: (files, title) => {
    const activePath = pickEntry(files)
    if (!activePath) throw new Error('No .scad file found. Upload an OpenSCAD file, or a .zip that contains one.')
    const parsed = parseFile(files, activePath)
    client.cancel()
    set((state) => ({
      project: { title: title ?? stem(activePath), description: '', files, activePath },
      parsed,
      values: { [activePath]: defaultValues(parsed) },
      revision: state.revision + 1,
      codeOpen: false,
      render: IDLE_RENDER,
    }))
    get().generate()
  },

  restoreProject: (project, values) => {
    const parsed = parseFile(project.files, project.activePath)
    set((state) => ({
      project,
      parsed,
      values: { ...values, [project.activePath]: reconcileValues(parsed, values[project.activePath]) },
      revision: state.revision + 1,
      render: IDLE_RENDER,
    }))
    get().generate()
  },

  closeProject: () => {
    client.cancel()
    set((state) => ({
      project: null,
      parsed: EMPTY_PARSE,
      values: {},
      revision: state.revision + 1,
      codeOpen: false,
      render: IDLE_RENDER,
    }))
  },

  setActivePath: (path) => {
    const { project } = get()
    if (!project || path === project.activePath || typeof project.files[path] !== 'string') return
    const parsed = parseFile(project.files, path)
    set((state) => ({
      project: { ...project, activePath: path },
      parsed,
      values: { ...state.values, [path]: reconcileValues(parsed, state.values[path]) },
      revision: state.revision + 1,
    }))
    get().generate()
  },

  setMeta: (meta) => set((state) => (state.project ? { project: { ...state.project, ...meta } } : {})),

  setValue: (name, value) => get().applyValues({ [name]: value }),

  applyValues: (changes) =>
    set((state) => {
      if (!state.project) return {}
      const path = state.project.activePath
      return {
        values: { ...state.values, [path]: { ...state.values[path], ...changes } },
        revision: state.revision + 1,
      }
    }),

  resetValues: () =>
    set((state) => {
      if (!state.project) return {}
      return {
        values: { ...state.values, [state.project.activePath]: defaultValues(state.parsed) },
        revision: state.revision + 1,
      }
    }),

  updateSource: (path, source) =>
    set((state) => {
      const { project } = state
      if (!project) return {}
      const files = { ...project.files, [path]: source }
      const changes: Partial<AppState> = { project: { ...project, files }, revision: state.revision + 1 }
      if (path === project.activePath) {
        const parsed = parseCustomizer(source)
        changes.parsed = parsed
        changes.values = { ...state.values, [path]: carryOverValues(parsed, state.parsed, state.values[path] ?? {}) }
      }
      return changes
    }),

  setFile: (path, content) =>
    set((state) =>
      state.project ? { project: { ...state.project, files: { ...state.project.files, [path]: content } } } : {},
    ),

  setAutoRegenerate: (autoRegenerate) => set({ autoRegenerate }),
  setQuality: (quality) => set((state) => (quality === state.quality ? {} : { quality, revision: state.revision + 1 })),
  setCodeOpen: (codeOpen) => set({ codeOpen }),
  setHydrated: () => set({ hydrated: true }),

  generate: () => {
    const { project, parsed, values, quality, revision } = get()
    if (!project) return
    const current = values[project.activePath] ?? {}
    if (firstError(parsed, current)) return

    const startedAt = Date.now()
    set((state) => ({
      render: {
        ...state.render,
        status: 'running',
        stage: 'loading-wasm',
        startedAt,
        errorMessage: null,
        requestedRevision: revision,
      },
    }))

    client
      .render(
        {
          files: project.files,
          entry: project.activePath,
          defines: buildDefines(parsed.parameters, current, quality),
          libraries: requiredLibraries(project.files),
          fonts: usesText(project.files),
        },
        (stage) => set((state) => ({ render: { ...state.render, stage } })),
      )
      .then(({ stl, log }) => {
        set({
          render: {
            status: 'done',
            stage: null,
            startedAt,
            durationMs: Date.now() - startedAt,
            log,
            errorMessage: null,
            stl,
            triangles: stlTriangleCount(stl),
            renderedRevision: revision,
            requestedRevision: revision,
          },
        })
      })
      .catch((error: unknown) => {
        if (error instanceof RenderCancelled) return
        set((state) => ({
          render: {
            ...state.render,
            status: 'error',
            stage: null,
            durationMs: Date.now() - startedAt,
            log: error instanceof RenderFailure ? error.log : [],
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        }))
      })
  },

  cancelRender: () => {
    if (get().render.status !== 'running') return
    client.cancel()
    set((state) => ({ render: { ...state.render, status: state.render.stl ? 'done' : 'idle', stage: null } }))
  },
}))

/** Loads the worker script in the background so the first Generate is faster. */
export function warmUpRenderer(): void {
  client.warmUp()
}

export function selectValues(state: AppState): Values {
  return (state.project && state.values[state.project.activePath]) || NO_VALUES
}

const NO_VALUES: Values = {}

/** True when the model on screen no longer matches the current source and values. */
export function selectIsStale(state: AppState): boolean {
  return state.render.stl !== null && state.render.status !== 'running' && state.render.renderedRevision !== state.revision
}
