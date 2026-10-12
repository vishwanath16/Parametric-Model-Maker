import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { indentWithTab } from '@codemirror/commands'
import { StreamLanguage } from '@codemirror/language'
import { clike } from '@codemirror/legacy-modes/mode/clike'
import { EditorState, Prec } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { EditorView, basicSetup } from 'codemirror'
import { useAppStore } from '../../store/appStore'

const words = (list: string): Record<string, boolean> => Object.fromEntries(list.split(' ').map((word) => [word, true]))

// OpenSCAD is close enough to C for the generic C-like tokenizer, given its own word lists.
const openscad = StreamLanguage.define(
  clike({
    name: 'openscad',
    keywords: words('module function if else for let each intersection_for assert echo use include'),
    blockKeywords: words('module if else for intersection_for'),
    atoms: words('true false undef PI'),
    builtin: words(
      'cube sphere cylinder polyhedron square circle polygon text import surface projection ' +
        'translate rotate scale resize mirror multmatrix color offset hull minkowski render ' +
        'union difference intersection linear_extrude rotate_extrude children ' +
        'abs sign sin cos tan acos asin atan atan2 floor round ceil ln len log pow sqrt exp rands min max ' +
        'norm cross concat lookup str chr ord search version is_undef is_bool is_num is_string is_list',
    ),
  }),
)

const fillHeight = EditorView.theme({
  '&': { height: '100%', fontSize: '13px' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
})

/** Editor for the active .scad file. Saving re-parses the parameters. */
export default function CodeDrawer() {
  const activePath = useAppStore((state) => state.project?.activePath ?? '')
  const source = useAppStore((state) => {
    const content = state.project?.files[activePath]
    return typeof content === 'string' ? content : ''
  })
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [dirty, setDirty] = useState(false)

  // The keymap is created once, so it reads the latest path through refs.
  const pathRef = useRef(activePath)
  pathRef.current = activePath
  const savedRef = useRef(source)
  savedRef.current = source

  const save = (): boolean => {
    const view = viewRef.current
    if (!view) return false
    const text = view.state.doc.toString()
    if (text !== savedRef.current) useAppStore.getState().updateSource(pathRef.current, text)
    setDirty(false)
    return true
  }

  const close = (): void => {
    if (dirty && !window.confirm('Discard unsaved changes to the code?')) return
    useAppStore.getState().setCodeOpen(false)
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: savedRef.current,
        extensions: [
          Prec.highest(
            keymap.of([
              { key: 'Mod-s', preventDefault: true, run: save },
              {
                key: 'Mod-Enter',
                preventDefault: true,
                run: () => {
                  save()
                  useAppStore.getState().generate()
                  return true
                },
              },
            ]),
          ),
          basicSetup,
          keymap.of([indentWithTab]),
          openscad,
          oneDark,
          fillHeight,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) setDirty(update.state.doc.toString() !== savedRef.current)
          }),
        ],
      }),
    })
    viewRef.current = view
    view.focus()
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Recreated per file only: `save` reads everything else through refs and the store.
  }, [activePath])

  return (
    <section
      aria-label="Code editor"
      className="absolute inset-y-0 left-0 z-10 flex w-full flex-col border-r border-line bg-bar shadow-2xl md:w-[min(680px,58%)]"
    >
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-3">
        <h2 className="min-w-0 flex-1 truncate font-mono text-[13px]">
          {activePath}
          {dirty && <span className="text-warn"> · unsaved</span>}
        </h2>
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          title="Save and re-read parameters (Ctrl/⌘+S)"
          className="h-8 rounded bg-primary px-3 font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={close} aria-label="Close code editor" className="rounded p-1.5 hover:bg-raised">
          <X size={18} aria-hidden />
        </button>
      </div>
      <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden" />
    </section>
  )
}
