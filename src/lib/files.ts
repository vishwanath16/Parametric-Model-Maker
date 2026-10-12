import { unzipSync } from 'fflate'

/** Text files are kept as strings so they can be edited and parsed; everything else as bytes. */
export type FileContent = string | Uint8Array
export type ProjectFiles = Record<string, FileContent>

export type LibraryName = 'BOSL2' | 'MCAD'
export const LIBRARY_NAMES: readonly LibraryName[] = ['BOSL2', 'MCAD']

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

const TEXT_EXTENSIONS = new Set(['scad', 'json', 'txt', 'csv', 'svg', 'dxf', 'md', 'dat'])
const INCLUDE = /^\s*(?:use|include)\s*<\s*([^>]+?)\s*>/gm

const extensionOf = (path: string): string => path.slice(path.lastIndexOf('.') + 1).toLowerCase()
const baseName = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

export const isScad = (path: string): boolean => extensionOf(path) === 'scad'

function decode(path: string, bytes: Uint8Array): FileContent {
  return TEXT_EXTENSIONS.has(extensionOf(path)) ? new TextDecoder().decode(bytes) : bytes
}

/**
 * Cleans uploaded paths: forward slashes, `.`/`..` resolved (never above the root), no OS metadata, and no
 * single wrapping folder (as produced by zipping a directory).
 */
export function normalizeFiles(files: ProjectFiles): ProjectFiles {
  const cleaned: [string, FileContent][] = []
  for (const [rawPath, content] of Object.entries(files)) {
    const segments: string[] = []
    for (const segment of rawPath.replace(/\\/g, '/').split('/')) {
      if (segment === '..') segments.pop()
      else if (segment !== '' && segment !== '.') segments.push(segment)
    }
    if (segments.length === 0) continue
    if (segments.some((segment) => segment === '__MACOSX' || segment.startsWith('.'))) continue
    cleaned.push([segments.join('/'), content])
  }

  const firstSegments = new Set(cleaned.map(([path]) => path.split('/')[0]))
  const allNested = cleaned.every(([path]) => path.includes('/'))
  const [root] = [...firstSegments]
  const strip = allNested && firstSegments.size === 1 && root !== undefined ? root.length + 1 : 0
  return Object.fromEntries(cleaned.map(([path, content]) => [path.slice(strip), content]))
}

/** Reads dropped or selected files, expanding any .zip archives. */
export async function readUploads(uploads: readonly File[]): Promise<ProjectFiles> {
  const total = uploads.reduce((sum, file) => sum + file.size, 0)
  if (total > MAX_UPLOAD_BYTES) {
    throw new Error(`Upload is too large (${Math.round(total / 1024 / 1024)} MB). The limit is 100 MB.`)
  }

  const files: ProjectFiles = {}
  for (const upload of uploads) {
    const bytes = new Uint8Array(await upload.arrayBuffer())
    if (extensionOf(upload.name) === 'zip') {
      let entries: Record<string, Uint8Array>
      try {
        entries = unzipSync(bytes)
      } catch {
        throw new Error(`${upload.name} is not a valid .zip archive.`)
      }
      for (const [path, data] of Object.entries(entries)) {
        if (!path.endsWith('/')) files[path] = decode(path, data)
      }
    } else {
      files[upload.webkitRelativePath || upload.name] = decode(upload.name, bytes)
    }
  }
  return normalizeFiles(files)
}

export function scadPaths(files: ProjectFiles): string[] {
  return Object.keys(files)
    .filter(isScad)
    .sort((a, b) => a.localeCompare(b))
}

/** Paths named in `use <...>` and `include <...>` statements. */
export function findIncludes(source: string): string[] {
  return [...source.matchAll(INCLUDE)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
}

/**
 * Chooses the file to open first: a .scad that no other file includes, preferring
 * files nearest the root, then alphabetical order.
 */
export function pickEntry(files: ProjectFiles): string | undefined {
  const candidates = scadPaths(files)
  const included = new Set<string>()
  for (const path of candidates) {
    const content = files[path]
    if (typeof content !== 'string') continue
    for (const include of findIncludes(content)) included.add(baseName(include))
  }
  const depth = (path: string): number => path.split('/').length
  const ranked = [...candidates].sort(
    (a, b) =>
      Number(included.has(baseName(a))) - Number(included.has(baseName(b))) ||
      depth(a) - depth(b) ||
      a.localeCompare(b),
  )
  return ranked[0]
}

/** Bundled libraries the project includes but did not upload itself. */
export function requiredLibraries(files: ProjectFiles): LibraryName[] {
  const paths = Object.keys(files)
  const includes = Object.values(files).flatMap((content) => (typeof content === 'string' ? findIncludes(content) : []))
  return LIBRARY_NAMES.filter(
    (name) =>
      includes.some((include) => include.startsWith(`${name}/`)) && !paths.some((path) => path.startsWith(`${name}/`)),
  )
}

/** Whether any .scad file calls `text()`, which needs fonts mounted. */
export function usesText(files: ProjectFiles): boolean {
  return Object.entries(files).some(
    ([path, content]) => isScad(path) && typeof content === 'string' && /\btext\s*\(/.test(content),
  )
}

/** `dir/model.scad` → `dir/model.json`, the Customizer's companion preset file. */
export function companionPresetPath(scadPath: string): string {
  return scadPath.replace(/\.scad$/i, '.json')
}

/** `dir/model.scad` → `model`. */
export function stem(path: string): string {
  return baseName(path).replace(/\.[^.]+$/, '')
}
