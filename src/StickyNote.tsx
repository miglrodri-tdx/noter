import { useEffect, useRef, useState, type DragEvent, type PointerEvent, type ReactNode } from 'react'
import { LuCalendar, LuGripHorizontal, LuMaximize2, LuMinus, LuTag, LuTrash2, LuX } from 'react-icons/lu'
import { RxCornerBottomRight } from 'react-icons/rx'
import { formatDue, isOverdue } from './due'
import { COLORS, NOTE_BG as BG, NOTE_DEFAULT, NOTE_MAX, NOTE_MIN, type Note, type NoteColor } from './types'

const DOT: Record<NoteColor, string> = {
  yellow: 'dot-yellow',
  pink: 'dot-pink',
  blue: 'dot-blue',
  green: 'dot-green',
  gray: 'dot-gray',
}

function Chip({ icon, label, overdue, removeLabel, onRemove }: {
  icon: ReactNode
  label: string
  overdue?: boolean
  removeLabel: string
  onRemove: () => void
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full bg-base-100/60 py-0.5 pr-1 pl-1.5 ${overdue ? 'text-error' : 'text-base-content/70'}`}
    >
      {icon}
      <span className="truncate">{label}</span>
      <button
        aria-label={removeLabel}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="cursor-pointer opacity-60 hover:opacity-100"
      >
        <LuX size={11} />
      </button>
    </span>
  )
}

/** Pick an existing tag or type a new one (Enter to confirm). */
function TagPicker({ current, tags, onPick }: { current?: string; tags: string[]; onPick: (tag: string | undefined) => void }) {
  const [q, setQ] = useState('')
  const typed = q.trim()
  const matches = tags.filter((t) => t.toLowerCase().includes(typed.toLowerCase()))
  return (
    <div
      className="absolute top-full right-0 z-10 mt-2 flex w-44 flex-col gap-1.5 rounded-lg bg-base-100 p-2 shadow-md ring-1 ring-base-content/15"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={q}
        maxLength={40}
        placeholder="Find or create tag…"
        aria-label="Tag"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && typed) onPick(typed)
        }}
        className="input input-xs w-full"
      />
      <div className="flex max-h-28 flex-col overflow-auto">
        {matches.map((t) => (
          <button
            key={t}
            onClick={() => onPick(t)}
            className={`cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-xs hover:bg-base-content/10 ${t === current ? 'font-semibold' : ''}`}
          >
            {t}
          </button>
        ))}
        {typed && !tags.includes(typed) && (
          <button
            onClick={() => onPick(typed)}
            className="cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-xs hover:bg-base-content/10"
          >
            Create “{typed}”
          </button>
        )}
      </div>
    </div>
  )
}

interface Props {
  note: Note
  tags: string[]
  autoFocus: boolean
  selected: boolean
  onChange: (id: string, patch: Partial<Note>) => void
  onRemove: (id: string) => void
  onRequestDelete: (id: string) => void
  onFocus: (id: string) => void
  /**
   * `kanban`/`calendar`: laid out in flow inside a column/day cell, fixed size, moved with the native drag-and-drop.
   * `calendar` starts compact (collapsed look) and expands locally, without touching `note.collapsed`.
   */
  variant?: 'canvas' | 'kanban' | 'calendar'
}

export function StickyNote({ note, tags, autoFocus, selected, onChange, onRemove, onRequestDelete, onFocus, variant = 'canvas' }: Props) {
  const kanban = variant !== 'canvas' // laid out in flow, dragged by its header
  const [open, setOpen] = useState(false) // calendar only
  const collapsed = variant === 'calendar' ? !open : !!note.collapsed
  const area = useRef<HTMLTextAreaElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const resize = useRef<{ sx: number; sy: number; w: number; h: number } | null>(null)

  // writing, changing color or collapsing "commits" a draft note: from then on only the delete button removes it
  const commit = (patch: Partial<Note>) =>
    onChange(
      note.id,
      ['text', 'color', 'collapsed', 'due', 'tag'].some((k) => k in patch) ? { ...patch, draft: false } : patch,
    )

  const root = useRef<HTMLDivElement>(null)
  const tools = useRef<HTMLDivElement>(null)
  const [pop, setPop] = useState<'color' | 'due' | 'tag' | null>(null)
  const toggle = (p: 'color' | 'due' | 'tag') => setPop((cur) => (cur === p ? null : p))

  useEffect(() => {
    if (autoFocus) area.current?.focus()
  }, [autoFocus])

  // close any open popover on a press outside the header tools
  useEffect(() => {
    if (!pop) return
    const close = (e: globalThis.PointerEvent) => {
      if (!tools.current?.contains(e.target as Node)) setPop(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [pop])

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { dx: e.clientX - note.x, dy: e.clientY - note.y }
    onFocus(note.id)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    onChange(note.id, {
      x: Math.max(0, Math.min(window.innerWidth - 40, e.clientX - d.dx)),
      y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - d.dy)),
    })
  }
  const up = () => {
    drag.current = null
  }

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  const rDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resize.current = { sx: e.clientX, sy: e.clientY, w: note.w, h: note.h }
    onFocus(note.id)
  }
  const rMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = resize.current
    if (!r) return
    onChange(note.id, {
      w: clamp(r.w + e.clientX - r.sx, NOTE_MIN.w, NOTE_MAX.w),
      h: clamp(r.h + e.clientY - r.sy, NOTE_MIN.h, NOTE_MAX.h),
    })
  }
  const rUp = () => {
    resize.current = null
  }

  return (
    <div
      className={`group ${kanban ? 'relative' : 'absolute'} flex flex-col rounded-md shadow-sm ring-1 ring-base-content/10 transition-shadow data-[selected=true]:shadow-md data-[selected=true]:ring-base-content/40 ${BG[note.color]}`}
      data-selected={selected}
      style={
        kanban
          ? { height: collapsed ? undefined : NOTE_DEFAULT.h }
          : { left: note.x, top: note.y, width: note.w, height: collapsed ? undefined : note.h, zIndex: note.z }
      }
      onClick={(e) => e.stopPropagation()}
      ref={root}
      onPointerDown={() => onFocus(note.id)}
      onBlur={(e) => {
        // a draft closes when focus leaves the note entirely (not when it moves between its own controls)
        if (note.draft && document.hasFocus() && !root.current?.contains(e.relatedTarget as Node | null)) onRemove(note.id)
      }}
      onMouseDown={(e) => {
        // interacting with this note's chrome (drag, colors, resize) puts focus in *this* note's textarea:
        // it stays focused if it already was, and otherwise takes focus (blurring, and so closing, any draft elsewhere).
        // Done manually because the browser would otherwise drop focus to <body> or the button.
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
        // kanban: the header is the native drag handle and preventDefault here would cancel the drag;
        // it is focusable (tabIndex -1) so focus still stays inside the note
        if (kanban && (e.target as HTMLElement).closest('[data-drag-handle]') && !(e.target as HTMLElement).closest('button')) return
        e.preventDefault()
        if (area.current) area.current.focus()
        else (document.activeElement as HTMLElement | null)?.blur() // collapsed: no textarea to focus
      }}
    >
      <div
        className={`flex h-6 shrink-0 cursor-grab items-center justify-between px-2 text-base-content/40 outline-none active:cursor-grabbing ${kanban ? '' : 'touch-none'}`}
        {...(kanban
          ? {
              draggable: true,
              tabIndex: -1,
              'data-drag-handle': true,
              onDragStart: (e: DragEvent<HTMLDivElement>) => {
                e.dataTransfer.setData('text/plain', note.id)
                if (root.current) e.dataTransfer.setDragImage(root.current, 20, 12)
              },
            }
          : { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up })}
      >
        <LuGripHorizontal size={14} className="shrink-0" />
        {collapsed && (
          <span className="mx-2 min-w-0 flex-1 truncate text-xs text-base-content/80 select-none">
            {note.text.split('\n').find((l) => l.trim()) || <span className="text-base-content/40">Empty note</span>}
          </span>
        )}
        <div
          ref={tools}
          className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-data-[selected=true]:opacity-100 group-hover:opacity-100"
        >
          {!collapsed && (
            <>
              <div className="relative flex items-center">
                <button
                  aria-label="Change color"
                  aria-expanded={pop === 'color'}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => toggle('color')}
                  className={`size-3 cursor-pointer rounded-full ${DOT[note.color]} ring-1 ring-base-content/40 ring-offset-1 ring-offset-transparent`}
                />
                {pop === 'color' && (
                  <div
                    className="absolute top-full right-0 z-10 mt-2 flex items-center gap-1.5 rounded-full bg-base-100 px-2 py-1.5 shadow-md ring-1 ring-base-content/15"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        aria-label={c}
                        onClick={() => {
                          commit({ color: c })
                          setPop(null)
                        }}
                        className={`size-3 cursor-pointer rounded-full ${DOT[c]} ${c === note.color ? 'ring-1 ring-base-content/60 ring-offset-1 ring-offset-transparent' : ''}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="relative flex items-center">
                <button
                  aria-label="Set due date"
                  aria-expanded={pop === 'due'}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => toggle('due')}
                  className="cursor-pointer text-base-content/40 hover:text-base-content"
                >
                  <LuCalendar size={13} />
                </button>
                {pop === 'due' && (
                  <div
                    className="absolute top-full right-0 z-10 mt-2 flex flex-col gap-1.5 rounded-lg bg-base-100 p-2 shadow-md ring-1 ring-base-content/15"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="datetime-local"
                      aria-label="Due date"
                      value={note.due ?? ''}
                      onChange={(e) => commit({ due: e.target.value || undefined })}
                      className="input input-xs w-44"
                    />
                    {note.due && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          commit({ due: undefined })
                          setPop(null)
                        }}
                      >
                        Remove due date
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="relative flex items-center">
                <button
                  aria-label="Set tag"
                  aria-expanded={pop === 'tag'}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => toggle('tag')}
                  className="cursor-pointer text-base-content/40 hover:text-base-content"
                >
                  <LuTag size={13} />
                </button>
                {pop === 'tag' && (
                  <TagPicker
                    current={note.tag}
                    tags={tags}
                    onPick={(tag) => {
                      commit({ tag })
                      setPop(null)
                    }}
                  />
                )}
              </div>
            </>
          )}
          <button
            aria-label={collapsed ? 'Expand note' : 'Collapse note'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => (variant === 'calendar' ? setOpen((o) => !o) : commit({ collapsed: !collapsed }))}
            className="cursor-pointer text-base-content/40 hover:text-base-content"
          >
            {collapsed ? <LuMaximize2 size={12} /> : <LuMinus size={13} />}
          </button>
          {!collapsed && (
          <button
            aria-label="Delete note"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRequestDelete(note.id)}
            className="cursor-pointer text-base-content/40 hover:text-base-content"
          >
            <LuTrash2 size={13} />
          </button>
          )}
        </div>
      </div>
      {(note.due || note.tag) && !(variant === 'calendar' && collapsed) && (
        <div className="flex shrink-0 flex-wrap items-center gap-1 px-2 pb-1 text-xs">
          {note.due && (
            <Chip
              icon={<LuCalendar size={11} />}
              label={formatDue(note.due)}
              overdue={isOverdue(note.due)}
              removeLabel="Remove due date"
              onRemove={() => commit({ due: undefined })}
            />
          )}
          {note.tag && (
            <Chip
              icon={<LuTag size={11} />}
              label={note.tag}
              removeLabel="Remove tag"
              onRemove={() => commit({ tag: undefined })}
            />
          )}
        </div>
      )}
      {!collapsed && (
      <textarea
        ref={area}
        value={note.text}
        placeholder="Write something…"
        onFocus={() => onFocus(note.id)}
        onChange={(e) => commit({ text: e.target.value })}
        className="block min-h-0 w-full flex-1 resize-none overflow-auto bg-transparent px-3 pb-6 text-sm leading-relaxed text-base-content outline-none placeholder:text-base-content/40"
      />
      )}
      {!collapsed && !kanban && (
      <div
        aria-label="Resize note"
        className="absolute right-0 bottom-0 grid size-5 cursor-nwse-resize touch-none place-items-center text-base-content/40 opacity-0 transition-opacity group-data-[selected=true]:opacity-100 group-hover:opacity-100"
        onPointerDown={rDown}
        onPointerMove={rMove}
        onPointerUp={rUp}
        onPointerCancel={rUp}
        onDoubleClick={() => onChange(note.id, { ...NOTE_DEFAULT })}
      >
        <RxCornerBottomRight size={12} />
      </div>
      )}
    </div>
  )
}
