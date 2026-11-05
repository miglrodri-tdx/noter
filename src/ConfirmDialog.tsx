import { useEffect } from 'react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" style={{ zIndex: 2000000 }}>
      <div className="modal-box max-w-sm p-5 shadow-lg">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="py-2 text-sm text-base-content/60">{message}</p>
        <div className="modal-action mt-2">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-neutral btn-sm" autoFocus onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/20" onClick={onCancel} />
    </div>
  )
}
