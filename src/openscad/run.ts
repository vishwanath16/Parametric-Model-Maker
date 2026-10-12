import type { ProjectFiles } from '../lib/files'

/** The parts of the Emscripten module this app uses. */
export interface OpenScadModule {
  callMain(args: string[]): number
  FS: {
    mkdir(path: string): void
    writeFile(path: string, data: string | ArrayBufferView): void
    readFile(path: string): string | Uint8Array
  }
}

export type CreateModule = (onLine: (line: string) => void) => Promise<OpenScadModule>

export type RenderErrorKind = 'wasm' | 'syntax' | 'empty' | 'not-3d' | 'crash' | 'failed'

export interface RunJob {
  /** Project files, mounted under /work. */
  files: ProjectFiles
  /** Path of the .scad to render, relative to the project root. */
  entry: string
  /** `name=value` strings for `-D`. */
  defines: readonly string[]
  /** Extra files mounted at absolute paths, e.g. /libraries/BOSL2/std.scad or /fonts/x.ttf. */
  systemFiles?: ProjectFiles
}

export type RunResult =
  | { ok: true; stl: Uint8Array; log: string[] }
  | { ok: false; kind: RenderErrorKind; message: string; log: string[] }

const WORK_DIR = '/work'
const OUTPUT = '/out.stl'
const NOISE = [/^Could not initialize localization/, /^Fontconfig error: Cannot load default config file/]

const MESSAGES: Readonly<Record<Exclude<RenderErrorKind, 'wasm'>, string>> = {
  syntax: 'The .scad file has a syntax error.',
  empty: 'The model is empty. Nothing was produced with these parameter values.',
  'not-3d': 'The model is 2D. Only 3D models can be shown and exported as STL.',
  crash: 'OpenSCAD crashed, most likely by running out of memory. Try lower quality or a smaller model.',
  failed: 'OpenSCAD could not render the model.',
}

function classify(log: readonly string[], crashed: boolean): Exclude<RenderErrorKind, 'wasm'> {
  const text = log.join('\n')
  if (/Parser error|Can't parse file/.test(text)) return 'syntax'
  if (/top level object is empty/i.test(text)) return 'empty'
  if (/not a 3D object/i.test(text)) return 'not-3d'
  return crashed ? 'crash' : 'failed'
}

function writeFile(module: OpenScadModule, path: string, content: string | Uint8Array): void {
  const segments = path.split('/').filter(Boolean)
  let directory = ''
  for (const segment of segments.slice(0, -1)) {
    directory += `/${segment}`
    try {
      module.FS.mkdir(directory)
    } catch {
      // Already exists.
    }
  }
  module.FS.writeFile(path, content)
}

/**
 * Renders one .scad to binary STL. A module instance can run `main` only once, so a
 * fresh one is created per call; the compiled WebAssembly is cached by the loader.
 */
export async function runOpenScad(createModule: CreateModule, job: RunJob): Promise<RunResult> {
  const log: string[] = []
  const module = await createModule((line) => {
    if (!NOISE.some((pattern) => pattern.test(line))) log.push(line)
  })

  for (const [path, content] of Object.entries(job.systemFiles ?? {})) writeFile(module, path, content)
  for (const [path, content] of Object.entries(job.files)) writeFile(module, `${WORK_DIR}/${path}`, content)

  const args = [
    `${WORK_DIR}/${job.entry}`,
    '-o',
    OUTPUT,
    '--backend=manifold',
    '--export-format=binstl',
    ...job.defines.flatMap((define) => ['-D', define]),
  ]

  let exitCode: number
  let crashed = false
  try {
    exitCode = module.callMain(args)
  } catch (error) {
    crashed = true
    exitCode = 1
    log.push(`OpenSCAD aborted: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (exitCode === 0) {
    try {
      const output = module.FS.readFile(OUTPUT)
      if (typeof output !== 'string' && output.byteLength > 84) return { ok: true, stl: output, log }
    } catch {
      // No output file: fall through to the failure path.
    }
  }

  const kind = classify(log, crashed)
  return { ok: false, kind, message: MESSAGES[kind], log }
}
