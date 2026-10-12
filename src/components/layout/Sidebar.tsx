import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { ActionBar } from '../customize/ActionBar'
import { CustomizeCard } from '../customize/CustomizeCard'
import { ModelCard } from '../model/ModelCard'

/**
 * Left sidebar on desktop. On narrow screens it becomes a bottom sheet: collapsed it
 * shows only the handle and the action bar; expanded it covers most of the screen.
 */
export function Sidebar() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <aside
      aria-label="Model settings"
      className={`flex shrink-0 flex-col max-md:rounded-t-xl max-md:border-t max-md:border-line max-md:bg-bar md:h-auto md:w-[432px] ${
        sheetOpen ? 'max-md:h-[72%]' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => setSheetOpen((open) => !open)}
        aria-expanded={sheetOpen}
        aria-controls="sidebar-content"
        className="flex h-9 shrink-0 items-center justify-center gap-2 text-[13px] text-muted md:hidden"
      >
        <ChevronUp size={16} aria-hidden className={`transition-transform ${sheetOpen ? 'rotate-180' : ''}`} />
        {sheetOpen ? 'Hide parameters' : 'Show parameters'}
      </button>
      <div
        id="sidebar-content"
        className={`min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 md:flex ${sheetOpen ? 'flex' : 'hidden'}`}
      >
        <ModelCard />
        <CustomizeCard />
      </div>
      <div className="px-3 pb-3 max-md:px-0 max-md:pb-0">
        <div className="overflow-hidden rounded-lg max-md:rounded-none">
          <ActionBar />
        </div>
      </div>
    </aside>
  )
}
