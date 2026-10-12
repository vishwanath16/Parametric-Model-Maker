import { useCallback, useEffect, useRef, useState } from 'react'
import { ViewerScene, type ViewPreset } from '../../viewer/ViewerScene'
import { useAppStore } from '../../store/appStore'
import { selectPlateSize, useViewerStore } from '../../store/viewerStore'
import { ConsolePanel } from './ConsolePanel'
import { DimensionsBadge } from './DimensionsBadge'
import { ExportButtons } from './ExportButtons'
import { RenderProgress } from './RenderProgress'
import { ViewportToolbar } from './ViewportToolbar'

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error))

export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ViewerScene | null>(null)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const stl = useAppStore((state) => state.render.stl)
  const plateId = useViewerStore((state) => state.plateId)
  const customPlate = useViewerStore((state) => state.customPlate)
  const showGrid = useViewerStore((state) => state.showGrid)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const { setViewerError, setDimensions } = useViewerStore.getState()
    try {
      const scene = new ViewerScene(container)
      sceneRef.current = scene
      setViewerError(null)
      return () => {
        scene.dispose()
        sceneRef.current = null
        setDimensions(null)
      }
    } catch (error) {
      setViewerError(`The 3D viewer could not start. Your browser may not support WebGL. (${describe(error)})`)
      return undefined
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setPlate(selectPlateSize({ plateId, customPlate }))
  }, [plateId, customPlate])

  useEffect(() => {
    sceneRef.current?.setGridVisible(showGrid)
  }, [showGrid])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const { setViewerError, setDimensions } = useViewerStore.getState()
    if (!stl) {
      scene.clearModel()
      setDimensions(null)
      return
    }
    try {
      setDimensions(scene.loadStl(stl))
      setViewerError(null)
    } catch (error) {
      scene.clearModel()
      setDimensions(null)
      setViewerError(`The rendered model could not be displayed. (${describe(error)})`)
    }
  }, [stl])

  const handleView = useCallback((preset: ViewPreset) => sceneRef.current?.setView(preset), [])
  const handleFit = useCallback(() => sceneRef.current?.fitModel(), [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" role="img" aria-label="3D view of the model on the build plate" />
      <RenderProgress />
      <ExportButtons />
      <ConsolePanel open={consoleOpen} onClose={() => setConsoleOpen(false)} />
      <DimensionsBadge />
      <ViewportToolbar
        onView={handleView}
        onFit={handleFit}
        consoleOpen={consoleOpen}
        onToggleConsole={() => setConsoleOpen((open) => !open)}
      />
    </div>
  )
}
