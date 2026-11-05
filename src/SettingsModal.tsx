import { useEffect, useRef, useState } from 'react'
import { LuDownload, LuUpload, LuX } from 'react-icons/lu'
import { parseBackup, type Backup } from './backup'
import { ConfirmDialog } from './ConfirmDialog'
import { THEMES, type Mode } from './themes'

const MODES: { id: Mode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

interface Props {
  mode: Mode
  theme: string
  onMode: (m: Mode) => void
  onTheme: (id: string) => void
  onExport: () => void
  onImport: (backup: Backup) => void
  onClose: () => void
}

export function SettingsModal({ mode, theme, onMode, onTheme, onExport, onImport, onClose }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [staged, setStaged] = useState<Backup | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (staged) return // the confirm dialog handles Escape itself
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, staged])

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      setStaged(parseBackup(await file.text()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this file.')
    }
  }
  const stagedNotes = staged?.canvas.canvases.reduce((n, c) => n + c.notes.length, 0) ?? 0

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Settings" style={{ zIndex: 2000000 }}>
      <div className="modal-box max-w-lg p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">Settings</h3>
          <button aria-label="Close settings" className="btn btn-ghost btn-xs btn-circle" onClick={onClose}>
            <LuX size={16} />
          </button>
        </div>

        <section className="mt-4">
          <h4 className="mb-2 text-xs font-medium tracking-wide text-base-content/50 uppercase">Appearance</h4>
          <div className="join w-full">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => onMode(m.id)}
                className={`btn btn-sm join-item flex-1 ${mode === m.id ? 'btn-neutral' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h4 className="mb-2 text-xs font-medium tracking-wide text-base-content/50 uppercase">{mode === 'light' ? 'Light' : 'Dark'} themes</h4>
          <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto p-0.5 sm:grid-cols-3">
            {THEMES.filter((t) => t.mode === mode).map((t) => (
              <button
                key={t.id}
                data-theme={t.id}
                onClick={() => onTheme(t.id)}
                aria-pressed={theme === t.id}
                className={`flex cursor-pointer flex-col gap-2 rounded-md border bg-base-100 p-2.5 text-left text-xs text-base-content transition ${
                  theme === t.id ? 'border-primary ring-1 ring-primary' : 'border-base-300 hover:border-base-content/40'
                }`}
              >
                <span className="truncate">{t.label}</span>
                <span className="flex gap-1">
                  <i className="size-3 rounded-full bg-primary" />
                  <i className="size-3 rounded-full bg-secondary" />
                  <i className="size-3 rounded-full bg-accent" />
                  <i className="size-3 rounded-full bg-base-300" />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h4 className="mb-2 text-xs font-medium tracking-wide text-base-content/50 uppercase">Data</h4>
          <div className="flex gap-2">
            <button className="btn btn-sm flex-1 gap-2" onClick={onExport}>
              <LuDownload size={14} /> Export everything
            </button>
            <button className="btn btn-sm flex-1 gap-2" onClick={() => fileInput.current?.click()}>
              <LuUpload size={14} /> Import…
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void pickFile(e.target.files?.[0])
                e.target.value = '' // allow re-selecting the same file
              }}
            />
          </div>
          <p className="mt-2 text-xs text-base-content/50">
            Exports all canvases, notes and theme to a JSON file. Importing replaces what's on this device.
          </p>
          {error && (
            <p role="alert" className="mt-2 text-xs text-error">
              {error}
            </p>
          )}
        </section>

        <p className="mt-5 text-xs text-base-content/40">
          Themes by{' '}
          <a className="link" href="https://github.com/dachinat/daisyui-themes" target="_blank" rel="noreferrer">
            dachinat
          </a>{' '}
          (CC BY 4.0)
        </p>
      </div>
      <div className="modal-backdrop bg-black/20" onClick={onClose} />
      {staged && (
        <ConfirmDialog
          title="Replace everything?"
          message={`This imports ${staged.canvas.canvases.length} canvas${staged.canvas.canvases.length === 1 ? '' : 'es'} and ${stagedNotes} note${stagedNotes === 1 ? '' : 's'}, and permanently replaces all canvases and notes currently on this device. Export first if you want to keep them.`}
          confirmLabel="Replace"
          onConfirm={() => {
            onImport(staged)
            setStaged(null)
            onClose()
          }}
          onCancel={() => setStaged(null)}
        />
      )}
    </div>
  )
}
