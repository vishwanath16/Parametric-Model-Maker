import type { RenderRequest, RenderStage, WorkerMessage } from './protocol'
import type { RenderErrorKind } from './run'

export type RenderJob = Omit<RenderRequest, 'id' | 'assetBase'>

export interface RenderOutput {
  stl: ArrayBuffer
  log: string[]
}

/** Thrown when a render is superseded by a newer one or cancelled by the user. */
export class RenderCancelled extends Error {
  constructor() {
    super('Render cancelled')
    this.name = 'RenderCancelled'
  }
}

/** Thrown when OpenSCAD fails; `log` holds its console output. */
export class RenderFailure extends Error {
  readonly kind: RenderErrorKind
  readonly log: string[]

  constructor(kind: RenderErrorKind, message: string, log: string[]) {
    super(message)
    this.name = 'RenderFailure'
    this.kind = kind
    this.log = log
  }
}

interface Pending {
  id: number
  resolve: (output: RenderOutput) => void
  reject: (error: Error) => void
  onStage: (stage: RenderStage) => void
}

/**
 * Owns the OpenSCAD worker. Only one render runs at a time: starting a new one, or
 * calling `cancel`, terminates the busy worker and replaces it with a fresh one.
 */
export class RenderClient {
  private worker: Worker | null = null
  private pending: Pending | null = null
  private nextId = 1

  /** Starts the worker ahead of the first render so its script is already loaded. */
  warmUp(): void {
    this.ensureWorker()
  }

  render(job: RenderJob, onStage: (stage: RenderStage) => void): Promise<RenderOutput> {
    this.cancel()
    const worker = this.ensureWorker()
    const id = this.nextId++
    return new Promise<RenderOutput>((resolve, reject) => {
      this.pending = { id, resolve, reject, onStage }
      const request: RenderRequest = { ...job, id, assetBase: new URL(import.meta.env.BASE_URL, location.href).href }
      worker.postMessage(request)
    })
  }

  /** Stops the in-flight render, if any. Its promise rejects with RenderCancelled. */
  cancel(): void {
    if (!this.pending) return
    const { reject } = this.pending
    this.pending = null
    this.worker?.terminate()
    this.worker = null
    reject(new RenderCancelled())
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => this.handleMessage(event.data)
    worker.onerror = (event) => {
      event.preventDefault()
      this.fail(new RenderFailure('wasm', 'The OpenSCAD worker could not be started.', [event.message || 'Worker error']))
    }
    this.worker = worker
    return worker
  }

  private handleMessage(message: WorkerMessage): void {
    const pending = this.pending
    if (!pending || message.id !== pending.id) return
    if (message.type === 'stage') {
      pending.onStage(message.stage)
    } else if (message.type === 'done') {
      this.pending = null
      pending.resolve({ stl: message.stl, log: message.log })
    } else {
      this.pending = null
      pending.reject(new RenderFailure(message.kind, message.message, message.log))
    }
  }

  private fail(error: Error): void {
    const pending = this.pending
    this.pending = null
    this.worker?.terminate()
    this.worker = null
    pending?.reject(error)
  }
}
