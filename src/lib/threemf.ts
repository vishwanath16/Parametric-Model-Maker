import { strToU8, zipSync } from 'fflate'
import { forEachTriangle } from './stl'

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>' +
  '</Types>'

const RELATIONSHIPS =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>' +
  '</Relationships>'

/**
 * Converts a binary STL (millimetres) to a 3MF package with one indexed mesh.
 * Vertices that are bit-identical in the STL are merged.
 */
export function stlToThreeMf(stl: ArrayBuffer): Uint8Array {
  const indexByVertex = new Map<string, number>()
  const vertices: string[] = []
  const triangles: string[] = []

  forEachTriangle(stl, (c) => {
    const indices: number[] = []
    for (let corner = 0; corner < 3; corner++) {
      const x = c[corner * 3] ?? 0
      const y = c[corner * 3 + 1] ?? 0
      const z = c[corner * 3 + 2] ?? 0
      const key = `${x} ${y} ${z}`
      let index = indexByVertex.get(key)
      if (index === undefined) {
        index = vertices.length
        indexByVertex.set(key, index)
        vertices.push(`<vertex x="${x}" y="${y}" z="${z}"/>`)
      }
      indices.push(index)
    }
    const [v1, v2, v3] = indices
    // Zero-area triangles are not allowed in 3MF.
    if (v1 !== v2 && v2 !== v3 && v1 !== v3) triangles.push(`<triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`)
  })

  const model =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">' +
    '<resources><object id="1" type="model"><mesh>' +
    `<vertices>${vertices.join('')}</vertices>` +
    `<triangles>${triangles.join('')}</triangles>` +
    '</mesh></object></resources>' +
    '<build><item objectid="1"/></build>' +
    '</model>'

  return zipSync({
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(RELATIONSHIPS),
    '3D/3dmodel.model': strToU8(model),
  })
}
