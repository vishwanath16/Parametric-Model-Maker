/** Printable volume in millimetres. */
export interface PlateSize {
  x: number
  y: number
  z: number
}

export interface PlatePreset {
  id: string
  label: string
  size: PlateSize
}

export const PLATE_PRESETS: readonly PlatePreset[] = [
  { id: 'x1', label: '256 × 256 (X1 / P1)', size: { x: 256, y: 256, z: 256 } },
  { id: 'a1mini', label: '180 × 180 (A1 mini)', size: { x: 180, y: 180, z: 180 } },
  { id: 'h2d', label: '350 × 320 (H2D)', size: { x: 350, y: 320, z: 325 } },
]

export const CUSTOM_PLATE_ID = 'custom'
export const DEFAULT_PLATE_ID = 'x1'
export const DEFAULT_PLATE_SIZE: PlateSize = { x: 256, y: 256, z: 256 }
