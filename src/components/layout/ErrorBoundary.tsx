import { Component, type ReactNode } from 'react'

interface ErrorBoundaryState {
  message: string | null
}

/** Last line of defence: shows a readable message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  override render(): ReactNode {
    if (this.state.message === null) return this.props.children
    return (
      <div role="alert" className="mx-auto flex h-full max-w-lg flex-col justify-center gap-3 p-6">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <pre className="whitespace-pre-wrap rounded bg-card p-3 font-mono text-xs text-danger">{this.state.message}</pre>
        <button
          type="button"
          onClick={() => location.reload()}
          className="h-9 self-start rounded bg-primary px-4 font-medium text-white hover:bg-primary-hover"
        >
          Reload
        </button>
      </div>
    )
  }
}
