import { parseCanvasState, type CanvasState } from './storage'
import { parseThemeState, type ThemeState } from './themes'

const APP = 'noter'

export interface Backup {
  canvas: CanvasState
  theme: ThemeState | null
}

export function downloadBackup(canvas: CanvasState, theme: ThemeState) {
  const data = { app: APP, version: 1, exportedAt: new Date().toISOString(), ...canvas, theme }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `noter-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Throws an Error with a user-readable message when the file isn't a valid backup. */
export function parseBackup(text: string): Backup {
  let raw: { app?: unknown; theme?: unknown }
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  const canvas = parseCanvasState(raw)
  if (!raw || raw.app !== APP || !canvas) throw new Error('This file is not a Noter backup.')
  return { canvas, theme: parseThemeState(raw.theme) }
}
