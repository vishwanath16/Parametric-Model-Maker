import type { LibraryName, ProjectFiles } from '../lib/files'
import type { RenderErrorKind } from './run'

export type RenderStage = 'loading-wasm' | 'loading-assets' | 'rendering'

export interface RenderRequest {
  id: number
  files: ProjectFiles
  entry: string
  defines: string[]
  /** Bundled libraries to fetch and mount under /libraries. */
  libraries: LibraryName[]
  /** Whether to fetch and mount the bundled fonts (needed by `text()`). */
  fonts: boolean
  /** Absolute URL of the app root, for fetching bundled assets from the worker. */
  assetBase: string
}

export type WorkerMessage =
  | { type: 'stage'; id: number; stage: RenderStage }
  | { type: 'done'; id: number; stl: ArrayBuffer; log: string[] }
  | { type: 'error'; id: number; kind: RenderErrorKind; message: string; log: string[] }
