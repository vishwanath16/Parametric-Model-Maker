const HEADER_BYTES = 84
const TRIANGLE_BYTES = 50

/** Number of triangles in a binary STL, or 0 if the buffer is not a well-formed one. */
export function stlTriangleCount(stl: ArrayBuffer): number {
  if (stl.byteLength < HEADER_BYTES) return 0
  const count = new DataView(stl).getUint32(80, true)
  return stl.byteLength >= HEADER_BYTES + count * TRIANGLE_BYTES ? count : 0
}

/** Calls `visit` with the nine coordinates of each triangle in a binary STL. */
export function forEachTriangle(stl: ArrayBuffer, visit: (coordinates: readonly number[]) => void): void {
  const count = stlTriangleCount(stl)
  const view = new DataView(stl)
  const coordinates = new Array<number>(9).fill(0)
  for (let triangle = 0; triangle < count; triangle++) {
    // Skip the 12-byte normal; the three vertices follow.
    const offset = HEADER_BYTES + triangle * TRIANGLE_BYTES + 12
    for (let i = 0; i < 9; i++) coordinates[i] = view.getFloat32(offset + i * 4, true)
    visit(coordinates)
  }
}
