export const COLORS = ['yellow', 'pink', 'blue', 'green', 'gray'] as const
export type NoteColor = (typeof COLORS)[number]

export const NOTE_BG: Record<NoteColor, string> = {
  yellow: 'note-yellow',
  pink: 'note-pink',
  blue: 'note-blue',
  green: 'note-green',
  gray: 'note-gray',
}

export interface Note {
  id: string
  x: number
  y: number
  text: string
  color: NoteColor
  z: number
  w: number
  h: number
  collapsed?: boolean
  /** due date/time as a local `YYYY-MM-DDTHH:mm` string (datetime-local format) */
  due?: string
  /** free-form category; becomes a kanban column */
  tag?: string
  /** freshly created and untouched: removed when focus leaves it. Cleared on first text/color/collapse change. */
  draft?: boolean
}

export const NOTE_DEFAULT = { w: 224, h: 160 }
export const NOTE_MIN = { w: 160, h: 100 }
export const NOTE_MAX = { w: 640, h: 640 }

export interface Canvas {
  id: string
  name: string
  notes: Note[]
  /** kanban column (tag) order for this canvas; tags not listed follow alphabetically */
  tagOrder?: string[]
}
