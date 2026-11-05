import { useCallback, useEffect, useState } from 'react'
import { parseCanvasState, parseNotes, type CanvasState } from './storage'
import { NOTE_DEFAULT, type Canvas, type Note } from './types'

const KEY = 'noter:v2'
const LEGACY_KEY = 'noter:notes:v1'

type State = CanvasState

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function makeCanvas(name: string, notes: Note[] = []): Canvas {
  return { id: crypto.randomUUID(), name, notes }
}

function load(): State {
  const v2 = parseCanvasState(read(KEY))
  if (v2) return v2
  // migrate notes saved before multi-canvas support
  const def = makeCanvas('Default', parseNotes(read(LEGACY_KEY)))
  return { canvases: [def], activeId: def.id }
}

const topZ = (notes: Note[]) => notes.reduce((m, n) => Math.max(m, n.z), 0) + 1

export function useCanvases() {
  const [state, setState] = useState<State>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable or full */
    }
  }, [state])

  const patchNotes = useCallback((fn: (notes: Note[]) => Note[]) => {
    setState((s) => ({
      ...s,
      canvases: s.canvases.map((c) => (c.id === s.activeId ? { ...c, notes: fn(c.notes) } : c)),
    }))
  }, [])

  const add = useCallback(
    (x: number, y: number) => {
      const id = crypto.randomUUID()
      patchNotes((ns) => [...ns, { id, x, y, text: '', color: 'yellow', z: topZ(ns), draft: true, ...NOTE_DEFAULT }])
      return id
    },
    [patchNotes],
  )
  const update = useCallback(
    (id: string, patch: Partial<Note>) => patchNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    [patchNotes],
  )
  const bringToFront = useCallback(
    (id: string) => patchNotes((ns) => ns.map((n) => (n.id === id ? { ...n, z: topZ(ns) } : n))),
    [patchNotes],
  )
  const remove = useCallback((id: string) => patchNotes((ns) => ns.filter((n) => n.id !== id)), [patchNotes])

  const setTagOrder = useCallback(
    (order: string[]) =>
      setState((s) => ({
        ...s,
        canvases: s.canvases.map((c) => (c.id === s.activeId ? { ...c, tagOrder: order } : c)),
      })),
    [],
  )

  const switchCanvas = useCallback((id: string) => setState((s) => ({ ...s, activeId: id })), [])
  const addCanvas = useCallback((name: string) => {
    const c = makeCanvas(name.trim() || 'Untitled')
    setState((s) => ({ canvases: [...s.canvases, c], activeId: c.id }))
  }, [])
  const renameCanvas = useCallback((id: string, name: string) => {
    const clean = name.trim()
    if (!clean) return
    setState((s) => ({ ...s, canvases: s.canvases.map((c) => (c.id === id ? { ...c, name: clean } : c)) }))
  }, [])
  const removeCanvas = useCallback((id: string) => {
    setState((s) => {
      if (s.canvases.length <= 1) return s
      const canvases = s.canvases.filter((c) => c.id !== id)
      return { canvases, activeId: s.activeId === id ? canvases[0].id : s.activeId }
    })
  }, [])

  const active = state.canvases.find((c) => c.id === state.activeId) ?? state.canvases[0]

  // every tag in use across all canvases, for the tag picker
  const allTags = [...new Set(state.canvases.flatMap((c) => c.notes.map((n) => n.tag).filter((t): t is string => !!t)))].sort(
    (a, b) => a.localeCompare(b),
  )

  return {
    allTags,
    canvases: state.canvases,
    activeId: active.id,
    notes: active.notes,
    tagOrder: active.tagOrder ?? [],
    setTagOrder,
    add, update, remove, bringToFront,
    switchCanvas, addCanvas, renameCanvas, removeCanvas,
    replaceAll: setState,
  }
}
