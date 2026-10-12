import { del, get, set } from 'idb-keyval'
import type { ProjectFiles } from '../lib/files'
import type { Quality } from '../openscad/defines'
import type { PlateSize } from '../viewer/plates'
import { useAppStore, type Project } from './appStore'
import type { Values } from './values'
import { useViewerStore } from './viewerStore'

/** What survives a page refresh. Stored in IndexedDB, which can hold binary files as-is. */
interface Session {
  project: Project | null
  values: Record<string, Values>
  autoRegenerate: boolean
  quality: Quality
  plateId: string
  customPlate: PlateSize
  showGrid: boolean
}

const KEY = 'parametric-model-maker:session:v1'
const SAVE_DELAY_MS = 400
const AUTO_REGENERATE_DELAY_MS = 500

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function isProject(value: unknown): value is Project {
  if (!isRecord(value) || !isRecord(value.files)) return false
  const { title, description, activePath, files } = value
  return (
    typeof title === 'string' &&
    typeof description === 'string' &&
    typeof activePath === 'string' &&
    typeof (files as ProjectFiles)[activePath] === 'string'
  )
}

function snapshot(): Session {
  const app = useAppStore.getState()
  const viewer = useViewerStore.getState()
  return {
    project: app.project,
    values: app.values,
    autoRegenerate: app.autoRegenerate,
    quality: app.quality,
    plateId: viewer.plateId,
    customPlate: viewer.customPlate,
    showGrid: viewer.showGrid,
  }
}

/** Restores the last session, if there is one. Never rejects: a broken store just starts fresh. */
async function restore(isStopped: () => boolean): Promise<void> {
  try {
    const saved: unknown = await get(KEY)
    if (!isRecord(saved) || isStopped()) return
    const session = saved as Partial<Session>

    useViewerStore.setState({
      ...(typeof session.plateId === 'string' ? { plateId: session.plateId } : {}),
      ...(isRecord(session.customPlate) ? { customPlate: session.customPlate } : {}),
      ...(typeof session.showGrid === 'boolean' ? { showGrid: session.showGrid } : {}),
    })
    useAppStore.setState({
      ...(typeof session.autoRegenerate === 'boolean' ? { autoRegenerate: session.autoRegenerate } : {}),
      ...(session.quality === 'preview' || session.quality === 'render' ? { quality: session.quality } : {}),
    })
    if (isProject(session.project)) {
      useAppStore.getState().restoreProject(session.project, isRecord(session.values) ? session.values : {})
    }
  } catch {
    await del(KEY).catch(() => undefined)
  }
}

/**
 * Restores the saved session, then keeps it saved and runs auto-regenerate.
 * Returns a function that stops both.
 */
export function startSession(): () => void {
  let stopped = false
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let regenerateTimer: ReturnType<typeof setTimeout> | undefined
  const unsubscribers: (() => void)[] = []

  const scheduleSave = (): void => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void set(KEY, snapshot()).catch(() => undefined), SAVE_DELAY_MS)
  }

  void restore(() => stopped).finally(() => {
    if (stopped) return
    useAppStore.getState().setHydrated()

    unsubscribers.push(
      useViewerStore.subscribe((state, previous) => {
        if (
          state.plateId !== previous.plateId ||
          state.customPlate !== previous.customPlate ||
          state.showGrid !== previous.showGrid
        ) {
          scheduleSave()
        }
      }),
      useAppStore.subscribe((state, previous) => {
        if (
          state.project !== previous.project ||
          state.values !== previous.values ||
          state.autoRegenerate !== previous.autoRegenerate ||
          state.quality !== previous.quality
        ) {
          scheduleSave()
        }

        const turnedOn = state.autoRegenerate && !previous.autoRegenerate
        const changed = state.revision !== previous.revision
        if (state.autoRegenerate && state.project && (changed || turnedOn)) {
          clearTimeout(regenerateTimer)
          regenerateTimer = setTimeout(() => {
            const latest = useAppStore.getState()
            if (latest.autoRegenerate && latest.render.requestedRevision !== latest.revision) latest.generate()
          }, AUTO_REGENERATE_DELAY_MS)
        }
      }),
    )
  })

  return () => {
    stopped = true
    clearTimeout(saveTimer)
    clearTimeout(regenerateTimer)
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}
