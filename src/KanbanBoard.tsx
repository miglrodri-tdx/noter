import { useRef, useState } from 'react'
import { LuPlus } from 'react-icons/lu'
import { StickyNote } from './StickyNote'
import type { Note } from './types'

interface Props {
  notes: Note[]
  tags: string[]
  selectedId: string | null
  focusId: string | null
  onChange: (id: string, patch: Partial<Note>) => void
  onRemove: (id: string) => void
  onRequestDelete: (id: string) => void
  onFocus: (id: string) => void
  tagOrder: string[]
  onReorder: (order: string[]) => void
  onAdd: (tag: string | undefined) => void
}

/** Cards without a tag come first, then one column per tag (alphabetical). Drag a card's header to another column to retag it. */
export function KanbanBoard({ notes, tags, selectedId, focusId, onChange, onRemove, onRequestDelete, onFocus, tagOrder, onReorder, onAdd }: Props) {
  const [over, setOver] = useState<string | null>(null) // column key being dragged over

  const dragCol = useRef<string | null>(null) // tag of the column being reordered (null while dragging a card)

  // saved order first, then tags not in it alphabetically
  const present = [...new Set(notes.map((n) => n.tag).filter((t): t is string => !!t))]
  const columnTags = [
    ...tagOrder.filter((t) => present.includes(t)),
    ...present.filter((t) => !tagOrder.includes(t)).sort((a, b) => a.localeCompare(b)),
  ]
  const columns: { key: string; title: string; tag?: string }[] = [
    { key: '', title: 'No tag' },
    ...columnTags.map((t) => ({ key: `tag:${t}`, title: t, tag: t })),
  ]

  // earliest due date first, cards without one last (stable, so creation order otherwise)
  const sorted = (tag?: string) =>
    notes.filter((n) => n.tag === tag).sort((a, b) => (a.due ?? '￿').localeCompare(b.due ?? '￿'))

  return (
    <div className="flex size-full items-start gap-4 overflow-auto p-6 pt-16">
      {columns.map((col) => {
        const cards = sorted(col.tag)
        return (
          <section
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.key)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setOver(null)
              const from = dragCol.current
              dragCol.current = null
              if (from !== null) {
                // column dropped on another column: take its place
                if (col.tag === undefined || col.tag === from) return
                const next = columnTags.filter((t) => t !== from)
                next.splice(columnTags.indexOf(col.tag), 0, from)
                onReorder(next)
                return
              }
              const id = e.dataTransfer.getData('text/plain')
              if (id) onChange(id, { tag: col.tag })
            }}
            className={`flex min-h-48 w-64 shrink-0 flex-col gap-2 rounded-lg p-2 ring-1 transition-colors ${
              over === col.key ? 'bg-base-content/10 ring-base-content/30' : 'bg-base-200/60 ring-base-content/10'
            }`}
          >
            <h2
              className={`flex items-center justify-between px-1 text-xs font-medium text-base-content/60 ${col.tag ? 'cursor-grab active:cursor-grabbing' : ''}`}
              draggable={!!col.tag}
              onDragStart={(e) => {
                if (!col.tag) return
                dragCol.current = col.tag
                e.dataTransfer.setData('application/x-noter-column', col.tag)
                e.dataTransfer.setDragImage(e.currentTarget.parentElement ?? e.currentTarget, 20, 12)
              }}
              onDragEnd={() => {
                dragCol.current = null
                setOver(null)
              }}
            >
              <span className="truncate">{col.title}</span>
              <span className="text-base-content/40">{cards.length}</span>
            </h2>
            {cards.map((n) => (
              <StickyNote
                key={n.id}
                variant="kanban"
                note={n}
                tags={tags}
                autoFocus={n.id === focusId}
                selected={n.id === selectedId}
                onChange={onChange}
                onRemove={onRemove}
                onRequestDelete={onRequestDelete}
                onFocus={onFocus}
              />
            ))}
            <button
              onClick={() => onAdd(col.tag)}
              className="btn btn-ghost btn-sm justify-start gap-1 text-base-content/50 hover:text-base-content"
            >
              <LuPlus size={14} /> Add card
            </button>
          </section>
        )
      })}
    </div>
  )
}
