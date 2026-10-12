import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

export function Accordion({ title, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <section className="border-b border-line last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 py-4 text-left text-sm font-semibold"
        >
          <span>{title}</span>
          <ChevronDown
            size={18}
            aria-hidden
            className={`shrink-0 text-muted transition-transform ${open ? '' : 'rotate-180'}`}
          />
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="pb-4">
        {children}
      </div>
    </section>
  )
}
