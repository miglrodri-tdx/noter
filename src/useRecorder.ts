import { useCallback, useEffect, useRef, useState } from 'react'
import { putAudio } from './audioStore'
import type { AudioClip } from './types'

const MAX_SECONDS = 10 * 60
const MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

const pickMime = () => MIMES.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''

/** False where recording can't work (no getUserMedia / MediaRecorder): the record button is hidden there. */
export const canRecord = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

function describe(e: unknown) {
  const name = (e as { name?: string } | null)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Microphone access was denied.'
  if (name === 'NotFoundError') return 'No microphone found.'
  return 'Could not start recording.'
}

interface RecorderOptions {
  onStart: () => void
  onDone: (clip: AudioClip) => void
}

/** Records the microphone with MediaRecorder; the finished blob is stored in IndexedDB and reported via `onDone`. */
export function useRecorder({ onStart, onDone }: RecorderOptions) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<{ mr: MediaRecorder; t0: number; discard: boolean } | null>(null)
  const alive = useRef(true)
  const cb = useRef({ onStart, onDone })
  useEffect(() => {
    cb.current = { onStart, onDone }
  })

  const stop = useCallback(() => {
    if (rec.current?.mr.state === 'recording') rec.current.mr.stop()
  }, [])

  const start = useCallback(async () => {
    if (rec.current) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser.')
      return
    }
    setError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setError(describe(e))
      return
    }
    if (!alive.current || rec.current) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    const mime = pickMime()
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    const chunks: Blob[] = []
    const r = { mr, t0: performance.now(), discard: false }
    rec.current = r
    mr.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    mr.onstop = async () => {
      const duration = (performance.now() - r.t0) / 1000
      stream.getTracks().forEach((t) => t.stop())
      rec.current = null
      setRecording(false)
      if (r.discard || !chunks.length) return
      const type = mr.mimeType || mime || 'audio/webm'
      const id = crypto.randomUUID()
      try {
        await putAudio(id, new Blob(chunks, { type }))
        cb.current.onDone({ id, duration, mime: type })
      } catch {
        setError('Could not save the recording (storage full?).')
      }
    }
    mr.start()
    cb.current.onStart()
    setElapsed(0)
    setRecording(true)
  }, [])

  // tick the timer and enforce the length cap
  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => {
      const t = rec.current ? (performance.now() - rec.current.t0) / 1000 : 0
      setElapsed(t)
      if (t >= MAX_SECONDS) stop()
    }, 250)
    return () => clearInterval(id)
  }, [recording, stop])

  // leaving the note (delete, canvas switch) discards an unfinished recording
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (rec.current) {
        rec.current.discard = true
        stop()
      }
    }
  }, [stop])

  return { recording, elapsed, error, start, stop }
}
