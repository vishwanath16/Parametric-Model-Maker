import { strFromU8, unzipSync, zipSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { parseCustomizer } from '../parser'
import {
  companionPresetPath,
  findIncludes,
  normalizeFiles,
  pickEntry,
  readUploads,
  requiredLibraries,
  stem,
  usesText,
} from './files'
import { decimalsOf, inferStep, stepNumber } from './numbers'
import { parsePresetFile, presetToValues, serializePresetFile, valuesToPreset } from './presets'
import { forEachTriangle, stlTriangleCount } from './stl'
import { stlToThreeMf } from './threemf'

/** Binary STL from a list of triangles, each nine coordinates. */
function makeStl(triangles: number[][]): ArrayBuffer {
  const buffer = new ArrayBuffer(84 + triangles.length * 50)
  const view = new DataView(buffer)
  view.setUint32(80, triangles.length, true)
  triangles.forEach((triangle, t) => {
    triangle.forEach((value, i) => view.setFloat32(84 + t * 50 + 12 + i * 4, value, true))
  })
  return buffer
}

// A unit tetrahedron: 4 triangles sharing 4 vertices.
const TETRAHEDRON = [
  [0, 0, 0, 0, 1, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 1, 0, 1, 0],
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
]

describe('files', () => {
  it('finds use and include paths, ignoring ones in comments mid-line', () => {
    const source = 'use <threads.scad>\ninclude <BOSL2/std.scad>\n  use <lib/a b.scad>\nx = 1; // use <no.scad>'
    expect(findIncludes(source)).toEqual(['threads.scad', 'BOSL2/std.scad', 'lib/a b.scad'])
  })

  it('normalizes paths and strips a single wrapping folder', () => {
    const files = normalizeFiles({
      'project\\main.scad': 'a',
      'project/lib/../lib/part.scad': 'b',
      '__MACOSX/project/._main.scad': 'junk',
      'project/.DS_Store': 'junk',
    })
    expect(Object.keys(files).sort()).toEqual(['lib/part.scad', 'main.scad'])
    // ".." can never climb above the project root.
    expect(Object.keys(normalizeFiles({ '../../etc/x.scad': 'a', 'main.scad': 'b' })).sort()).toEqual(['etc/x.scad', 'main.scad'])
  })

  it('keeps folders when files sit at different roots', () => {
    expect(Object.keys(normalizeFiles({ 'main.scad': 'a', 'lib/part.scad': 'b' })).sort()).toEqual([
      'lib/part.scad',
      'main.scad',
    ])
  })

  it('picks the file that nothing else includes', () => {
    expect(
      pickEntry({
        'a_helpers.scad': 'module helper() {}',
        'main.scad': 'use <a_helpers.scad>\nhelper();',
        'notes.txt': 'hi',
      }),
    ).toBe('main.scad')
  })

  it('prefers shallow files, then alphabetical order, and returns undefined with no .scad', () => {
    expect(pickEntry({ 'lib/z.scad': '', 'b.scad': '', 'a.scad': '' })).toBe('a.scad')
    expect(pickEntry({ 'readme.txt': 'x' })).toBeUndefined()
  })

  it('requests bundled libraries only when included and not uploaded', () => {
    expect(requiredLibraries({ 'm.scad': 'include <BOSL2/std.scad>\nuse <MCAD/gears.scad>' })).toEqual(['BOSL2', 'MCAD'])
    expect(requiredLibraries({ 'm.scad': 'include <BOSL2/std.scad>', 'BOSL2/std.scad': '' })).toEqual([])
    expect(requiredLibraries({ 'm.scad': 'cube(1);' })).toEqual([])
  })

  it('detects text() calls', () => {
    expect(usesText({ 'm.scad': 'linear_extrude(1) text ("a");' })).toBe(true)
    expect(usesText({ 'm.scad': 'context(1);', 'notes.txt': 'text(' })).toBe(false)
  })

  it('derives companion and stem names', () => {
    expect(companionPresetPath('dir/model.SCAD')).toBe('dir/model.json')
    expect(stem('dir/my.model.scad')).toBe('my.model')
  })

  it('reads plain files and expands zip archives', async () => {
    const zip = zipSync({
      'kit/main.scad': strToU8('use <lib/part.scad>\npart();'),
      'kit/lib/part.scad': strToU8('module part() cube(1);'),
      'kit/logo.png': new Uint8Array([1, 2, 3]),
    })
    const files = await readUploads([new File([new Uint8Array(zip)], 'kit.zip')])
    expect(Object.keys(files).sort()).toEqual(['lib/part.scad', 'logo.png', 'main.scad'])
    expect(files['main.scad']).toBe('use <lib/part.scad>\npart();')
    expect(files['logo.png']).toBeInstanceOf(Uint8Array)

    const plain = await readUploads([new File(['cube(1);'], 'a.scad'), new File(['{}'], 'a.json')])
    expect(plain).toEqual({ 'a.scad': 'cube(1);', 'a.json': '{}' })
  })

  it('rejects a corrupt zip with a readable message', async () => {
    await expect(readUploads([new File(['not a zip'], 'bad.zip')])).rejects.toThrow('bad.zip is not a valid .zip')
  })
})

describe('presets', () => {
  const { parameters } = parseCustomizer('w = 5;\nname = "a";\nv = [1, 2];\non = true;')

  it('round-trips values through the OpenSCAD parameter-set format', () => {
    const set = valuesToPreset(parameters, { w: 7.5, name: 'true', v: [3, 4], on: false })
    expect(set).toEqual({ w: '7.5', name: 'true', v: '[3, 4]', on: 'false' })
    const text = serializePresetFile({ mine: set })
    expect(JSON.parse(text)).toEqual({ fileFormatVersion: '1', parameterSets: { mine: set } })
    expect(presetToValues(parameters, parsePresetFile(text).mine ?? {})).toEqual({
      w: 7.5,
      name: 'true',
      v: [3, 4],
      on: false,
    })
  })

  it('skips unknown variables and values of the wrong type', () => {
    expect(presetToValues(parameters, { w: 'wide', v: '[1, 2, 3]', on: 'yes', gone: '1', name: 'ok' })).toEqual({
      name: 'ok',
    })
  })

  it('accepts raw JSON numbers and booleans written by other tools', () => {
    const sets = parsePresetFile('{"parameterSets":{"a":{"w":9,"on":false}}}')
    expect(presetToValues(parameters, sets.a ?? {})).toEqual({ w: 9, on: false })
  })

  it('rejects files that are not parameter sets', () => {
    expect(() => parsePresetFile('nope')).toThrow('not valid JSON')
    expect(() => parsePresetFile('{"a":1}')).toThrow('parameterSets')
  })
})

describe('numbers', () => {
  it('counts decimals', () => {
    expect([decimalsOf(5), decimalsOf(0.25), decimalsOf(1e-7), decimalsOf(Number.NaN)]).toEqual([0, 2, 7, 0])
  })

  it('infers a step from the precision of the samples', () => {
    expect(inferStep(22)).toBe(1)
    expect(inferStep(0.2)).toBe(0.1)
    expect(inferStep(1, 0.25)).toBe(0.01)
  })

  it('steps without floating-point noise and clamps to the limits', () => {
    expect(stepNumber(0.1, 0.2, 1)).toBe(0.3)
    expect(stepNumber(0.2, 0.05, -1)).toBe(0.15)
    expect(stepNumber(9.5, 1, 1, 0, 10)).toBe(10)
    expect(stepNumber(0, 1, -1, 0, 10)).toBe(0)
    expect(stepNumber(Number.NaN, 1, 1, 3)).toBe(4)
  })
})

describe('stl and 3mf', () => {
  it('counts and visits triangles, and treats truncated data as empty', () => {
    const stl = makeStl(TETRAHEDRON)
    expect(stlTriangleCount(stl)).toBe(4)
    const seen: number[][] = []
    forEachTriangle(stl, (coordinates) => seen.push([...coordinates]))
    expect(seen).toEqual(TETRAHEDRON)
    expect(stlTriangleCount(stl.slice(0, 100))).toBe(0)
    expect(stlTriangleCount(new ArrayBuffer(10))).toBe(0)
  })

  it('writes a 3MF package with merged vertices', () => {
    const entries = unzipSync(stlToThreeMf(makeStl(TETRAHEDRON)))
    expect(Object.keys(entries).sort()).toEqual(['3D/3dmodel.model', '[Content_Types].xml', '_rels/.rels'])
    const model = strFromU8(entries['3D/3dmodel.model'] ?? new Uint8Array())
    expect(model).toContain('unit="millimeter"')
    expect(model.match(/<vertex /g)).toHaveLength(4)
    expect(model.match(/<triangle /g)).toHaveLength(4)
    expect(model).toContain('<triangle v1="0" v2="1" v3="2"/>')
  })

  it('drops degenerate triangles from 3MF output', () => {
    const entries = unzipSync(stlToThreeMf(makeStl([...TETRAHEDRON, [0, 0, 0, 0, 0, 0, 1, 0, 0]])))
    expect(strFromU8(entries['3D/3dmodel.model'] ?? new Uint8Array()).match(/<triangle /g)).toHaveLength(4)
  })
})
