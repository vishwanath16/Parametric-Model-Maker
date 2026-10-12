import { unzipSync } from 'fflate'
import type { LibraryName, ProjectFiles } from '../lib/files'
import type { RenderRequest, WorkerMessage } from './protocol'
import { runOpenScad, type CreateModule } from './run'

const FONT_FILES = ['LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf', 'LiberationMono-Regular.ttf']
const FONT_CONFIG = '<?xml version="1.0"?><fontconfig><dir>/fonts</dir></fontconfig>'

const scope = self as unknown as {
  postMessage(message: WorkerMessage, transfer?: Transferable[]): void
  onmessage: ((event: MessageEvent<RenderRequest>) => void) | null
}

// Loaded once per worker; later renders reuse the compiled WebAssembly.
let wasmModule: Promise<typeof import('openscad-wasm')> | undefined
const assetCache = new Map<string, Promise<ProjectFiles>>()

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download ${url} (HTTP ${response.status})`)
  return new Uint8Array(await response.arrayBuffer())
}

function cached(key: string, load: () => Promise<ProjectFiles>): Promise<ProjectFiles> {
  let entry = assetCache.get(key)
  if (!entry) {
    entry = load()
    entry.catch(() => assetCache.delete(key))
    assetCache.set(key, entry)
  }
  return entry
}

function loadLibrary(name: LibraryName, assetBase: string): Promise<ProjectFiles> {
  return cached(`library:${name}`, async () => {
    const entries = unzipSync(await fetchBytes(`${assetBase}libraries/${name}.zip`))
    const files: ProjectFiles = {}
    for (const [path, data] of Object.entries(entries)) {
      if (!path.endsWith('/')) files[`/libraries/${path}`] = data
    }
    return files
  })
}

function loadFonts(assetBase: string): Promise<ProjectFiles> {
  return cached('fonts', async () => {
    const files: ProjectFiles = { '/fonts/fonts.conf': FONT_CONFIG }
    await Promise.all(
      FONT_FILES.map(async (name) => {
        files[`/fonts/${name}`] = await fetchBytes(`${assetBase}fonts/${name}`)
      }),
    )
    return files
  })
}

async function render(request: RenderRequest): Promise<void> {
  const { id } = request
  const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error))

  scope.postMessage({ type: 'stage', id, stage: 'loading-wasm' })
  let createModule: CreateModule
  try {
    wasmModule ??= import('openscad-wasm')
    const { createOpenSCAD } = await wasmModule
    createModule = async (onLine) =>
      (await createOpenSCAD({ noInitialRun: true, print: onLine, printErr: onLine })).getInstance()
    // Instantiate once up front so a broken or blocked WebAssembly build is reported as such.
    await createModule(() => undefined)
  } catch (error) {
    wasmModule = undefined
    scope.postMessage({
      type: 'error',
      id,
      kind: 'wasm',
      message: 'OpenSCAD (WebAssembly) could not be loaded. Check your connection and reload the page.',
      log: [describe(error)],
    })
    return
  }

  let systemFiles: ProjectFiles = {}
  if (request.libraries.length > 0 || request.fonts) {
    scope.postMessage({ type: 'stage', id, stage: 'loading-assets' })
    try {
      const parts = await Promise.all([
        ...request.libraries.map((name) => loadLibrary(name, request.assetBase)),
        ...(request.fonts ? [loadFonts(request.assetBase)] : []),
      ])
      systemFiles = Object.assign({}, ...parts) as ProjectFiles
    } catch (error) {
      scope.postMessage({
        type: 'error',
        id,
        kind: 'failed',
        message: 'A bundled library or font could not be downloaded.',
        log: [describe(error)],
      })
      return
    }
  }

  scope.postMessage({ type: 'stage', id, stage: 'rendering' })
  try {
    const result = await runOpenScad(createModule, {
      files: request.files,
      entry: request.entry,
      defines: request.defines,
      systemFiles,
    })
    if (result.ok) {
      const stl = result.stl.slice().buffer
      scope.postMessage({ type: 'done', id, stl, log: result.log }, [stl])
    } else {
      scope.postMessage({ type: 'error', id, kind: result.kind, message: result.message, log: result.log })
    }
  } catch (error) {
    scope.postMessage({
      type: 'error',
      id,
      kind: 'crash',
      message: 'OpenSCAD crashed while rendering.',
      log: [describe(error)],
    })
  }
}

scope.onmessage = (event) => void render(event.data)
