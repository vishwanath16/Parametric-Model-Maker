import { ChevronLeft } from 'lucide-react'

interface HeaderProps {
  /** Shows the back arrow and calls this when it is pressed. */
  onBack?: () => void
}

export function Header({ onBack }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-bar px-3">
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Back to upload" title="Back to upload" className="rounded p-1.5 hover:bg-raised">
          <ChevronLeft size={20} aria-hidden />
        </button>
      )}
      <h1 className={`text-base font-medium ${onBack ? '' : 'pl-2'}`}>Parametric Model Maker</h1>
    </header>
  )
}
