import { NOTE_DEFAULT, type Note } from './types'

const GAP = 16
const MARGIN = 24
const TOP = 56 // clear of the floating controls

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: Note) =>
  a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP

/**
 * First spot in the viewport (scanning left→right, top→bottom) where a default-size note
 * doesn't overlap any of `notes`. If the screen is full, cascades diagonally instead.
 */
export function freeSpot(notes: Note[]): { x: number; y: number } {
  const { w, h } = NOTE_DEFAULT
  for (let y = TOP; y + h <= window.innerHeight - MARGIN; y += h + GAP) {
    for (let x = MARGIN; x + w <= window.innerWidth - MARGIN; x += w + GAP) {
      if (!notes.some((n) => overlaps({ x, y, w, h }, n))) return { x, y }
    }
  }
  const step = (notes.length % 10) * 24
  return { x: MARGIN + step, y: TOP + step }
}
