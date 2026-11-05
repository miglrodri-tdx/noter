import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LuCalendar, LuLayers, LuLayoutGrid, LuStickyNote, LuTag } from 'react-icons/lu'

export const ONBOARDED_KEY = 'noter:onboarded:v1'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) !== null
  } catch {
    return true // storage unavailable: don't nag on every load
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1')
  } catch {
    // ignore
  }
}

const mini = 'rounded-md border border-base-300 p-2 text-xs text-base-content/70 shadow-sm'

interface Step {
  icon: ReactNode
  title: string
  body: string
  art: ReactNode
}

const STEPS: Step[] = [
  {
    icon: <LuStickyNote size={22} />,
    title: 'Click anywhere to drop a note',
    body: 'Every note is a card you can drag, resize, colour and collapse. Give it a due date or a tag right from the card.',
    art: (
      <div className="relative h-28 w-full">
        <div className={`note-yellow ${mini} absolute top-2 left-6 w-32 -rotate-3`}>Buy milk</div>
        <div className={`note-blue ${mini} absolute top-10 left-28 w-36 rotate-2`}>
          <p>Ship the release</p>
          <span className="mt-1 flex gap-1.5 text-base-content/50">
            <LuCalendar size={12} /> <LuTag size={12} />
          </span>
        </div>
        <div className={`note-green ${mini} absolute top-16 right-10 w-28 rotate-1`}>Call Ana</div>
      </div>
    ),
  },
  {
    icon: <LuLayers size={22} />,
    title: 'One canvas per topic',
    body: 'The name at the top left opens your canvases: create, rename and switch between them. Press 1–9 to jump straight to one.',
    art: (
      <div className="flex w-full items-center justify-center gap-2">
        {['Work', 'Home', 'Ideas'].map((n, i) => (
          <span
            key={n}
            className={`rounded-md border px-3 py-1.5 text-sm ${i === 0 ? 'border-primary text-primary' : 'border-base-300 text-base-content/60'}`}
          >
            {n} <kbd className="kbd kbd-xs ml-1">{i + 1}</kbd>
          </span>
        ))}
      </div>
    ),
  },
  {
    icon: <LuLayoutGrid size={22} />,
    title: 'Same notes, three views',
    body: 'Canvas is free-form, Kanban groups notes into columns by tag, Calendar lays them out by due date. Switch at the top right.',
    art: (
      <div className="join">
        {['Canvas', 'Kanban', 'Calendar'].map((v, i) => (
          <span key={v} className={`btn btn-sm join-item pointer-events-none ${i === 1 ? 'btn-primary' : ''}`}>
            {v}
          </span>
        ))}
      </div>
    ),
  },
]

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Welcome to Noter" style={{ zIndex: 2000000 }}>
      <div className="modal-box max-w-md p-6 shadow-lg">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.15 }}
          >
            <div className="grid h-32 place-items-center rounded-box bg-base-200/60">{step.art}</div>
            <div className="mt-5 flex items-center gap-2 text-primary">{step.icon}</div>
            <h3 className="mt-2 text-lg font-medium">{step.title}</h3>
            <p className="mt-1.5 text-sm text-base-content/60">{step.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, n) => (
              <i key={n} className={`size-1.5 rounded-full ${n === i ? 'bg-primary' : 'bg-base-300'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {last ? (
              i > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)}>
                  Back
                </button>
              )
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                Skip
              </button>
            )}
            {!last && i > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)}>
                Back
              </button>
            )}
            <button className="btn btn-neutral btn-sm" autoFocus onClick={() => (last ? onClose() : setI(i + 1))}>
              {last ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
        {last && <p className="mt-4 text-xs text-base-content/40">Everything stays in your browser. Export or import from Settings.</p>}
      </div>
      <div className="modal-backdrop bg-black/20" onClick={onClose} />
    </div>
  )
}
