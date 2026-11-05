import { useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
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
}

const pad = (n: number) => String(n).padStart(2, '0')
/** local `YYYY-MM-DD`, the same prefix a note's `due` has */
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// 2024-01-01 is a Monday: weeks start on Monday
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }),
)

/**
 * Month grid. A card sits on the day of its due date; cards without one are gathered on today.
 * Drag a card's header to another day to reschedule it (keeps its time, 09:00 if it had none).
 */
export function CalendarView({ notes, tags, selectedId, focusId, onChange, onRemove, onRequestDelete, onFocus }: Props) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [over, setOver] = useState<string | null>(null)

  const todayKey = dayKey(new Date())
  const offset = (month.getDay() + 6) % 7 // days of the previous month shown before the 1st
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const weeks = Math.ceil((offset + daysInMonth) / 7)
  const days = Array.from({ length: weeks * 7 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + i))

  const byDay = new Map<string, Note[]>()
  for (const n of notes) {
    const key = n.due ? n.due.slice(0, 10) : todayKey
    byDay.set(key, [...(byDay.get(key) ?? []), n])
  }
  const cardsOn = (key: string) =>
    (byDay.get(key) ?? []).sort((a, b) => (a.due ?? '￿').localeCompare(b.due ?? '￿'))

  const shift = (by: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1))
  const title = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="flex size-full flex-col gap-3 overflow-auto p-6 pt-16">
      <header className="flex items-center gap-2">
        <button aria-label="Previous month" onClick={() => shift(-1)} className="btn btn-ghost btn-sm btn-square">
          <LuChevronLeft size={16} />
        </button>
        <button aria-label="Next month" onClick={() => shift(1)} className="btn btn-ghost btn-sm btn-square">
          <LuChevronRight size={16} />
        </button>
        <h1 className="min-w-40 text-lg font-medium capitalize">{title}</h1>
        <button
          onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
          className="btn btn-ghost btn-sm"
        >
          Today
        </button>
      </header>

      <div className="grid min-w-[56rem] grid-cols-7 gap-px rounded-lg bg-base-content/10 ring-1 ring-base-content/10"
        style={{ gridTemplateRows: `auto repeat(${weeks}, minmax(9rem, auto))` }}
      >
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-base-200 px-2 py-1 text-xs font-medium text-base-content/60 capitalize">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = dayKey(d)
          const inMonth = d.getMonth() === month.getMonth()
          const isToday = key === todayKey
          return (
            <section
              key={key}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(key)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                const id = e.dataTransfer.getData('text/plain')
                const note = notes.find((n) => n.id === id)
                if (note) onChange(id, { due: `${key}T${note.due?.slice(11) || '09:00'}` })
              }}
              className={`flex flex-col gap-1 p-1.5 transition-colors ${
                isToday ? 'bg-primary/10 ring-2 ring-primary/60 ring-inset' : inMonth ? 'bg-base-100' : 'bg-base-200/60'
              } ${over === key ? 'bg-base-content/10' : ''}`}
            >
              <span
                className={`self-start px-1 text-xs ${
                  isToday
                    ? 'rounded-full bg-primary px-1.5 font-semibold text-primary-content'
                    : inMonth
                      ? 'text-base-content/70'
                      : 'text-base-content/30'
                }`}
              >
                {d.getDate()}
              </span>
              {cardsOn(key).map((n) => (
                <div key={n.id} className={inMonth ? '' : 'opacity-60'}>
                  <StickyNote
                    variant="calendar"
                    note={n}
                    tags={tags}
                    autoFocus={n.id === focusId}
                    selected={n.id === selectedId}
                    onChange={onChange}
                    onRemove={onRemove}
                    onRequestDelete={onRequestDelete}
                    onFocus={onFocus}
                  />
                </div>
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
