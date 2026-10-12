// Integration tests: these run the real OpenSCAD WebAssembly build (it also works in Node).
import { readFileSync } from 'node:fs'
import { createOpenSCAD } from 'openscad-wasm'
import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../examples'
import type { ProjectFiles } from '../lib/files'
import { pickEntry, usesText } from '../lib/files'
import { forEachTriangle, stlTriangleCount } from '../lib/stl'
import { parseCustomizer } from '../parser'
import { buildDefines } from './defines'
import { runOpenScad, type CreateModule, type RunJob, type RunResult } from './run'

const createModule: CreateModule = async (onLine) =>
  (await createOpenSCAD({ noInitialRun: true, print: onLine, printErr: onLine })).getInstance()

const FONTS: ProjectFiles = {
  '/fonts/fonts.conf': '<?xml version="1.0"?><fontconfig><dir>/fonts</dir></fontconfig>',
  ...Object.fromEntries(
    ['LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf', 'LiberationMono-Regular.ttf'].map((name) => [
      `/fonts/${name}`,
      new Uint8Array(readFileSync(`public/fonts/${name}`)),
    ]),
  ),
}

const render = (job: Partial<RunJob> & { files: ProjectFiles }): Promise<RunResult> =>
  runOpenScad(createModule, { entry: 'main.scad', defines: [], ...job })

function size(result: RunResult): number[] {
  if (!result.ok) throw new Error(`Render failed: ${result.message}\n${result.log.join('\n')}`)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const stl = result.stl.slice().buffer
  forEachTriangle(stl, (c) => {
    c.forEach((value, i) => {
      min[i % 3] = Math.min(min[i % 3] ?? value, value)
      max[i % 3] = Math.max(max[i % 3] ?? value, value)
    })
  })
  expect(stlTriangleCount(stl)).toBeGreaterThan(0)
  return max.map((value, i) => Math.round((value - (min[i] ?? 0)) * 100) / 100)
}

describe('runOpenScad', () => {
  it('renders a cube to binary STL', async () => {
    expect(size(await render({ files: { 'main.scad': 'cube([10, 20, 30]);' } }))).toEqual([10, 20, 30])
  })

  it('applies -D overrides for numbers, vectors, booleans and strings', async () => {
    const source = 'w = 1;\ndims = [1, 1];\ntall = false;\nname = "a";\ncube([w + len(name), dims[1], tall ? 50 : 5]);'
    const { parameters } = parseCustomizer(source)
    const defines = buildDefines(parameters, { w: 4, dims: [9, 7], tall: true, name: 'q"\\z' })
    expect(size(await render({ files: { 'main.scad': source }, defines }))).toEqual([8, 7, 50])
  })

  it('resolves use/include between uploaded files, including subfolders', async () => {
    const result = await render({
      entry: 'models/main.scad',
      files: {
        'models/main.scad': 'use <../lib/part.scad>\ninclude <config.scad>\npart(side);',
        'models/config.scad': 'side = 6;',
        'lib/part.scad': 'module part(s) cube(s);',
      },
    })
    expect(size(result)).toEqual([6, 6, 6])
  })

  it('finds libraries mounted under /libraries', async () => {
    const result = await render({
      files: { 'main.scad': 'use <MyLib/shapes.scad>\nbrick();' },
      systemFiles: { '/libraries/MyLib/shapes.scad': 'module brick() cube([3, 2, 1]);' },
    })
    expect(size(result)).toEqual([3, 2, 1])
  })

  it('reports syntax errors with the console output', async () => {
    const result = await render({ files: { 'main.scad': 'cube(10' } })
    expect(result).toMatchObject({ ok: false, kind: 'syntax' })
    expect(result.log.join('\n')).toMatch(/Parser error/)
  })

  it('reports empty and 2D models distinctly', async () => {
    expect(await render({ files: { 'main.scad': 'x = 1;' } })).toMatchObject({ ok: false, kind: 'empty' })
    expect(await render({ files: { 'main.scad': 'difference() { cube(1); cube(2, center = true); }' } })).toMatchObject({
      ok: false,
      kind: 'empty',
    })
    expect(await render({ files: { 'main.scad': 'square(5);' } })).toMatchObject({ ok: false, kind: 'not-3d' })
  })
})

describe('bundled examples', () => {
  for (const example of EXAMPLES) {
    it(`renders "${example.title}" with its default values`, async () => {
      const entry = pickEntry(example.files)
      if (!entry) throw new Error('Example has no .scad file')
      const { parameters, groups } = parseCustomizer(String(example.files[entry]))
      expect(groups.length).toBeGreaterThanOrEqual(3)
      const result = await render({
        files: example.files,
        entry,
        defines: buildDefines(parameters, {}),
        systemFiles: usesText(example.files) ? FONTS : {},
      })
      const [x, y, z] = size(result)
      expect(Math.min(x ?? 0, y ?? 0, z ?? 0)).toBeGreaterThan(1)
      expect(result.log.join('\n')).not.toMatch(/WARNING|ERROR/)
    })
  }

  it('adapter: has the expected groups and responds to its parameters', async () => {
    const adapter = EXAMPLES[0]
    if (!adapter) throw new Error('Missing adapter example')
    const source = String(adapter.files['mic_to_camera_adapter.scad'])
    const { parameters, groups } = parseCustomizer(source)
    expect(groups.map((group) => group.name)).toEqual([
      'Fit - radial clearance per side, mm',
      'Body',
      '3/8"-16 socket (bottom, female)',
      '1/4"-20 stud (top, male)',
      'Quality',
    ])
    const result = await render({
      files: adapter.files,
      entry: 'mic_to_camera_adapter.scad',
      defines: buildDefines(parameters, { body_d: 30, body_h: 20, stud_len: 12, knurl: false }, 'preview'),
    })
    const [x, y, z] = size(result)
    expect(x).toBeCloseTo(30, 0)
    expect(y).toBeCloseTo(30, 0)
    expect(z).toBeCloseTo(32, 1)
  })
})
