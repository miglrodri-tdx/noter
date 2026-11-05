import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { LuCheck, LuChevronDown, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'
import { Brand } from './ui/Brand'
import type { Canvas } from './types'

interface Props {
  canvases: Canvas[]
  activeId: string
  onSwitch: (id: string) => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onRequestDelete: (id: string) => void
}

export function CanvasSwitcher({ canvases, activeId, onSwitch, onAdd, onRename, onRequestDelete }: Props) {
  const [open, setOpen] = useState(false)
  // editing: id of canvas being renamed, or 'new' when creating one
  const [editing, setEditing] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const active = canvases.find((c) => c.id === activeId)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    setEditing(null)
  }
  const startEdit = (id: string, initial: string) => {
    setEditing(id)
    setValue(initial)
  }
  const commit = () => {
    if (editing === 'new') {
      if (value.trim()) {
        onAdd(value)
        close()
        return
      }
    } else if (editing) onRename(editing, value)
    setEditing(null)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') {
      e.stopPropagation()
      setEditing(null)
    }
  }

  const input = (
    <input
      autoFocus
      value={value}
      maxLength={32}
      placeholder="Canvas name"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKey}
      onBlur={commit}
      className="input input-xs w-full"
    />
  )

  return (
    <div
      className="fixed top-3 left-3 flex items-center gap-1 text-sm"
      style={{ zIndex: 1000000 }}
      onClick={(e) => e.stopPropagation()}
    >
      <Brand />
      <div ref={root} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost btn-sm gap-1.5 font-normal text-base-content/60 hover:text-base-content"
      >
        <span className="max-w-40 truncate">{active?.name}</span>
        <LuChevronDown size={14} />
      </button>

      {open && (
        <ul className="menu menu-sm absolute top-full left-0 mt-1 w-60 rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
          {canvases.map((c, i) => (
            <li key={c.id}>
              {editing === c.id ? (
                <div className="p-1">{input}</div>
              ) : (
                <div
                  className="group/row flex items-center gap-2"
                  onClick={() => {
                    onSwitch(c.id)
                    close()
                  }}
                >
                  <LuCheck size={14} className={c.id === activeId ? 'opacity-70' : 'opacity-0'} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-base-content/25 group-hover/row:hidden">{c.notes.length || ''}</span>
                  <span className="hidden items-center gap-2 text-base-content/40 group-hover/row:flex">
                    <button
                      aria-label="Rename canvas"
                      className="hover:text-base-content"
                      onClick={(e) => {
                        e.stopPropagation()
                        startEdit(c.id, c.name)
                      }}
                    >
                      <LuPencil size={13} />
                    </button>
                    {canvases.length > 1 && (
                      <button
                        aria-label="Delete canvas"
                        className="hover:text-base-content"
                        onClick={(e) => {
                          e.stopPropagation()
                          close()
                          onRequestDelete(c.id)
                        }}
                      >
                        <LuTrash2 size={13} />
                      </button>
                    )}
                  </span>
                  <span className="w-5 shrink-0 text-right">
                    {i < 9 && <kbd className="kbd kbd-xs text-base-content/60">{i + 1}</kbd>}
                  </span>
                </div>
              )}
            </li>
          ))}
          <li className="mt-1 border-t border-base-300 pt-1">
            {editing === 'new' ? (
              <div className="p-1">{input}</div>
            ) : (
              <button className="text-base-content/60" onClick={() => startEdit('new', '')}>
                <LuPlus size={14} /> New canvas
              </button>
            )}
          </li>
        </ul>
      )}
      </div>
    </div>
  )
}
