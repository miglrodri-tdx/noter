import { useEffect, useRef, useState } from 'react'
import { LuPause, LuPlay, LuSquare, LuTrash2 } from 'react-icons/lu'
import { getAudio } from './audioStore'
import type { AudioClip } from './types'

function fmt(s: number) {
  const t = Math.max(0, Math.floor(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

const stopDown = (e: { stopPropagation: () => void }) => e.stopPropagation()
const iconBtn = 'cursor-pointer text-base-content/50 hover:text-base-content'

function AudioPlayer({ clip, onDelete }: { clip: AudioClip; onDelete: () => void }) {
  const el = useRef<HTMLAudioElement>(null)
  const fixing = useRef(false)
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | undefined
    getAudio(clip.id)
      .then((blob) => {
        if (cancelled) return
        if (!blob) return setMissing(true)
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setMissing(true))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [clip.id])

  if (missing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-base-content/60">
        <span className="min-w-0 flex-1 truncate">Recording unavailable on this device</span>
        <button aria-label="Remove recording" onPointerDown={stopDown} onClick={onDelete} className={iconBtn}>
          <LuTrash2 size={12} />
        </button>
      </div>
    )
  }

  const toggle = () => {
    const a = el.current
    if (!a) return
    if (a.paused) a.play().catch(() => setPlaying(false))
    else a.pause()
  }
  const reset = () => {
    const a = el.current
    if (!a) return
    a.pause()
    a.currentTime = 0
    setT(0)
  }

  return (
    <div className="flex items-center gap-1.5">
      {url && (
        <audio
          ref={el}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setT(0)
          }}
          // MediaRecorder webm reports duration = Infinity, which breaks seeking: seek far ahead once to force the browser to compute it
          onLoadedMetadata={() => {
            const a = el.current
            if (a && !Number.isFinite(a.duration)) {
              fixing.current = true
              a.currentTime = 1e101
            }
          }}
          onTimeUpdate={() => {
            const a = el.current
            if (!a) return
            if (fixing.current) {
              fixing.current = false
              a.currentTime = 0
              return
            }
            setT(a.currentTime)
          }}
        />
      )}
      <button
        aria-label={playing ? 'Pause' : 'Play'}
        disabled={!url}
        onPointerDown={stopDown}
        onClick={toggle}
        className={`${iconBtn} shrink-0 disabled:opacity-40`}
      >
        {playing ? <LuPause size={13} /> : <LuPlay size={13} />}
      </button>
      <button aria-label="Stop" disabled={!url} onPointerDown={stopDown} onClick={reset} className={`${iconBtn} shrink-0 disabled:opacity-40`}>
        <LuSquare size={12} />
      </button>
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={clip.duration}
        step="any"
        value={Math.min(t, clip.duration)}
        disabled={!url}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (el.current) el.current.currentTime = v
          setT(v)
        }}
        className="range range-xs min-w-0 flex-1"
      />
      <span className="shrink-0 text-[11px] text-base-content/60 tabular-nums">{fmt(playing || t ? t : clip.duration)}</span>
      <button aria-label="Delete recording" onPointerDown={stopDown} onClick={onDelete} className={`${iconBtn} shrink-0`}>
        <LuTrash2 size={12} />
      </button>
    </div>
  )
}

interface BarProps {
  clip?: AudioClip
  recording: boolean
  elapsed: number
  error: string | null
  onStop: () => void
  onDelete: () => void
}

/** The row shown under the note header: recording status, an error, or the player. */
export function AudioBar({ clip, recording, elapsed, error, onStop, onDelete }: BarProps) {
  if (!recording && !clip && !error) return null
  return (
    <div className="shrink-0 px-2 pb-1 text-xs">
      {recording ? (
        <div className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-error" />
          <span className="flex-1 text-base-content/70 tabular-nums">Recording {fmt(elapsed)}</span>
          <button aria-label="Stop recording" onPointerDown={stopDown} onClick={onStop} className={iconBtn}>
            <LuSquare size={13} />
          </button>
        </div>
      ) : clip ? (
        <AudioPlayer key={clip.id} clip={clip} onDelete={onDelete} />
      ) : (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
    </div>
  )
}
