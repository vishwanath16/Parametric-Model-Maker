import { create } from 'zustand'
import type { Dimensions } from '../viewer/ViewerScene'
import {
  CUSTOM_PLATE_ID,
  DEFAULT_PLATE_ID,
  DEFAULT_PLATE_SIZE,
  PLATE_PRESETS,
  type PlateSize,
} from '../viewer/plates'

interface ViewerState {
  plateId: string
  customPlate: PlateSize
  showGrid: boolean
  /** Size of the model currently shown, or null when the plate is empty. */
  dimensions: Dimensions | null
  /** Set when the viewer itself fails (no WebGL, unreadable STL). */
  viewerError: string | null
  setPlateId: (id: string) => void
  setCustomPlate: (size: Partial<PlateSize>) => void
  toggleGrid: () => void
  setDimensions: (dimensions: Dimensions | null) => void
  setViewerError: (message: string | null) => void
}

export const useViewerStore = create<ViewerState>((set) => ({
  plateId: DEFAULT_PLATE_ID,
  customPlate: { ...DEFAULT_PLATE_SIZE },
  showGrid: true,
  dimensions: null,
  viewerError: null,
  setPlateId: (plateId) => set({ plateId }),
  setCustomPlate: (size) => set((state) => ({ customPlate: { ...state.customPlate, ...size } })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setDimensions: (dimensions) => set({ dimensions }),
  setViewerError: (viewerError) => set({ viewerError }),
}))

export function selectPlateSize(state: Pick<ViewerState, 'plateId' | 'customPlate'>): PlateSize {
  if (state.plateId === CUSTOM_PLATE_ID) return state.customPlate
  return PLATE_PRESETS.find((preset) => preset.id === state.plateId)?.size ?? DEFAULT_PLATE_SIZE
}
