import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import type { PlateSize } from './plates'

export type ViewPreset = 'top' | 'front' | 'side' | 'iso'

export interface Dimensions {
  x: number
  y: number
  z: number
}

const BACKGROUND = 0x1b1b1b
const PLATE_COLOR = 0x3b3b3b
const GRID_COLOR = 0x505050
const MODEL_COLOR = 0xe6e6e6
const PLATE_CORNER_RADIUS = 6
const GRID_SPACING = 10
const FOV = 35

const VIEW_DIRECTIONS: Record<ViewPreset, [number, number, number]> = {
  // Slightly off the pole so OrbitControls keeps a stable heading.
  top: [0, -0.0001, 1],
  front: [0, -1, 0],
  side: [1, 0, 0],
  iso: [0.35, -1, 0.75],
}

/**
 * Imperative three.js scene: Z-up (OpenSCAD convention), build plate centred on the
 * origin in the XY plane, model centred on the plate and resting on z = 0.
 */
export class ViewerScene {
  private readonly container: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private readonly plateGroup = new THREE.Group()
  private readonly modelMaterial = new THREE.MeshStandardMaterial({
    color: MODEL_COLOR,
    roughness: 0.75,
    metalness: 0.05,
  })
  private grid: THREE.LineSegments | null = null
  private model: THREE.Mesh | null = null
  private plate: PlateSize = { x: 256, y: 256, z: 256 }
  private gridVisible = true
  private frame = 0

  constructor(container: HTMLElement) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(BACKGROUND)
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.touchAction = 'none'
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 20000)
    this.camera.up.set(0, 0, 1)

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1.3))
    const headlight = new THREE.DirectionalLight(0xffffff, 1.6)
    headlight.position.set(0.6, 0.8, 1)
    this.camera.add(headlight)
    this.scene.add(this.camera)
    this.scene.add(this.plateGroup)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.addEventListener('change', this.requestRender)

    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(container)

    this.buildPlate()
    this.resize()
    this.setView('iso')
  }

  setPlate(size: PlateSize): void {
    if (size.x === this.plate.x && size.y === this.plate.y && size.z === this.plate.z) return
    this.plate = { ...size }
    this.buildPlate()
    this.setView('iso')
  }

  setGridVisible(visible: boolean): void {
    this.gridVisible = visible
    if (this.grid) this.grid.visible = visible
    this.requestRender()
  }

  /** Parses an STL (binary or ASCII), places it on the plate and returns its size in mm. */
  loadStl(data: ArrayBuffer): Dimensions {
    const geometry = new STLLoader().parse(data)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    const vertexCount = geometry.getAttribute('position')?.count ?? 0
    if (!box || box.isEmpty() || vertexCount === 0) {
      geometry.dispose()
      throw new Error('The STL contains no geometry.')
    }

    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    geometry.translate(-center.x, -center.y, -box.min.z)

    this.clearModel()
    this.model = new THREE.Mesh(geometry, this.modelMaterial)
    this.scene.add(this.model)
    this.controls.target.set(0, 0, size.z / 2)
    this.controls.update()
    this.requestRender()
    return { x: size.x, y: size.y, z: size.z }
  }

  clearModel(): void {
    if (!this.model) return
    this.scene.remove(this.model)
    this.model.geometry.dispose()
    this.model = null
    this.requestRender()
  }

  setView(preset: ViewPreset): void {
    const [dx, dy, dz] = VIEW_DIRECTIONS[preset]
    const radius = Math.max(this.plate.x, this.plate.y) / 2
    const distance = (radius / Math.tan(THREE.MathUtils.degToRad(FOV / 2))) * 1.25
    const offset = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(distance)
    this.camera.position.copy(this.controls.target).add(offset)
    this.controls.update()
    this.requestRender()
  }

  /** Zooms to the model from the current direction. Does nothing when the plate is empty. */
  fitModel(): void {
    const box = this.model?.geometry.boundingBox
    if (!box) return
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    const distance = (Math.max(sphere.radius, 1) / Math.sin(THREE.MathUtils.degToRad(FOV / 2))) * 1.15
    const direction = this.camera.position.clone().sub(this.controls.target).normalize()
    this.controls.target.copy(sphere.center)
    this.camera.position.copy(sphere.center).addScaledVector(direction, distance)
    this.controls.update()
    this.requestRender()
  }

  dispose(): void {
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.controls.removeEventListener('change', this.requestRender)
    this.controls.dispose()
    this.clearModel()
    this.disposePlate()
    this.modelMaterial.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private buildPlate(): void {
    this.disposePlate()
    const { x: w, y: h } = this.plate
    const r = Math.min(PLATE_CORNER_RADIUS, w / 2, h / 2)
    const left = -w / 2
    const bottom = -h / 2

    const shape = new THREE.Shape()
    shape.moveTo(left + r, bottom)
    shape.lineTo(left + w - r, bottom)
    shape.quadraticCurveTo(left + w, bottom, left + w, bottom + r)
    shape.lineTo(left + w, bottom + h - r)
    shape.quadraticCurveTo(left + w, bottom + h, left + w - r, bottom + h)
    shape.lineTo(left + r, bottom + h)
    shape.quadraticCurveTo(left, bottom + h, left, bottom + h - r)
    shape.lineTo(left, bottom + r)
    shape.quadraticCurveTo(left, bottom, left + r, bottom)

    const surface = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: PLATE_COLOR, side: THREE.DoubleSide }),
    )
    // Sit just under z = 0 so the model's base never z-fights with the plate.
    surface.position.z = -0.2
    this.plateGroup.add(surface)

    const points: number[] = []
    for (let gx = Math.ceil((left + r) / GRID_SPACING) * GRID_SPACING; gx <= -left - r; gx += GRID_SPACING) {
      points.push(gx, bottom, 0, gx, -bottom, 0)
    }
    for (let gy = Math.ceil((bottom + r) / GRID_SPACING) * GRID_SPACING; gy <= -bottom - r; gy += GRID_SPACING) {
      points.push(left, gy, 0, -left, gy, 0)
    }
    const gridGeometry = new THREE.BufferGeometry()
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    this.grid = new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ color: GRID_COLOR }))
    this.grid.position.z = -0.1
    this.grid.visible = this.gridVisible
    this.plateGroup.add(this.grid)
    this.requestRender()
  }

  private disposePlate(): void {
    for (const child of [...this.plateGroup.children]) {
      this.plateGroup.remove(child)
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        const materials: THREE.Material[] = Array.isArray(child.material) ? child.material : [child.material]
        for (const material of materials) material.dispose()
      }
    }
    this.grid = null
  }

  private readonly resize = (): void => {
    const { clientWidth, clientHeight } = this.container
    if (clientWidth === 0 || clientHeight === 0) return
    this.renderer.setSize(clientWidth, clientHeight)
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    // Draw synchronously: setSize clears the canvas, so waiting a frame would flicker.
    this.renderer.render(this.scene, this.camera)
  }

  private readonly requestRender = (): void => {
    cancelAnimationFrame(this.frame)
    this.frame = requestAnimationFrame(() => this.renderer.render(this.scene, this.camera))
  }
}
