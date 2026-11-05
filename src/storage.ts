import { COLORS, NOTE_DEFAULT, type Canvas, type Note } from './types'

export interface CanvasState {
  canvases: Canvas[]
  activeId: string
}

export function parseNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (n) =>
        n && typeof n.id === 'string' && typeof n.x === 'number' && typeof n.y === 'number' &&
        typeof n.text === 'string' && COLORS.includes(n.color) && typeof n.z === 'number',
    )
    .map((n): Note => ({
      ...n,
      draft: undefined, // a draft never survives a reload
      due: typeof n.due === 'string' && n.due ? n.due : undefined,
      tag: typeof n.tag === 'string' && n.tag.trim() ? n.tag.trim() : undefined,
      w: typeof n.w === 'number' ? n.w : NOTE_DEFAULT.w,
      h: typeof n.h === 'number' ? n.h : NOTE_DEFAULT.h,
    }))
}

/** Validates `{ canvases, activeId }`; returns null when nothing usable is found. */
export function parseCanvasState(raw: unknown): CanvasState | null {
  const v = raw as { canvases?: unknown; activeId?: unknown } | null
  if (!v || !Array.isArray(v.canvases)) return null
  const canvases: Canvas[] = v.canvases
    .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
    .map((c) => ({
      id: c.id,
      name: c.name,
      notes: parseNotes(c.notes),
      tagOrder: Array.isArray(c.tagOrder) ? c.tagOrder.filter((t: unknown) => typeof t === 'string') : undefined,
    }))
  if (!canvases.length) return null
  const activeId = canvases.some((c) => c.id === v.activeId) ? (v.activeId as string) : canvases[0].id
  return { canvases, activeId }
}
