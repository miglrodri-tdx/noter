import { useEffect, useRef, useState } from "react";
import { LuSettings } from "react-icons/lu";
import { CanvasSwitcher } from "./CanvasSwitcher";
import { CalendarView } from "./CalendarView";
import { KanbanBoard } from "./KanbanBoard";
import { freeSpot } from "./placement";
import { ConfirmDialog } from "./ConfirmDialog";
import { downloadBackup, type Backup } from "./backup";
import { SettingsModal } from "./SettingsModal";
import { StickyNote } from "./StickyNote";
import { NOTE_DEFAULT } from "./types";
import { useCanvases } from "./useCanvases";
import { useTheme } from "./useTheme";

const NOTE_W = NOTE_DEFAULT.w;

type View = "canvas" | "kanban" | "calendar";

type Pending = { kind: "note" | "canvas"; id: string };

export default function App() {
  const c = useCanvases();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedRaw, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const hadSelection = useRef(false);
  // the view lives in the URL hash (#/kanban) so it survives reloads and back/forward
  const viewFromUrl = (): View => {
    const v = window.location.hash.replace("#/", "");
    return v === "kanban" || v === "calendar" ? v : "canvas";
  };
  const [view, setView] = useState(viewFromUrl);

  const applyView = (v: View) => {
    if (v === view) return;
    // leaving the canvas closes any untouched draft (unmounting doesn't fire its blur)
    c.notes.filter((n) => n.draft).forEach((n) => c.remove(n.id));
    if (v === "canvas") {
      // cards created in the kanban and never placed sit at 0,0 stacked on top of each other: spread them out
      const placed = c.notes.filter((n) => !n.draft && !(n.x === 0 && n.y === 0));
      c.notes
        .filter((n) => !n.draft && n.x === 0 && n.y === 0)
        .forEach((n) => {
          const spot = freeSpot(placed);
          placed.push({ ...n, ...spot });
          c.update(n.id, spot);
        });
    }
    setSelectedId(null);
    setFocusId(null);
    setView(v);
  };

  const showView = (v: View) => {
    if (v === view) return;
    const { pathname, search } = window.location;
    window.history.pushState(null, "", v === "canvas" ? pathname + search : `#/${v}`);
    applyView(v);
  };

  useEffect(() => {
    const onPop = () => applyView(viewFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    state: themeState,
    mode,
    theme,
    setMode,
    setTheme,
    replace: replaceTheme,
  } = useTheme();

  // ignore stale ids (e.g. an empty note that was auto-removed)
  const selectedId = c.notes.some((n) => n.id === selectedRaw)
    ? selectedRaw
    : null;

  const switchTo = (id: string) => {
    setFocusId(null);
    setSelectedId(null);
    c.switchCanvas(id);
  };

  // 1–9 jump to the nth canvas. Plain digits are ignored while typing;
  // Alt/Option+digit works everywhere, even inside a note.
  const { canvases } = c;
  const modalOpen = settingsOpen || pending !== null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m = /^Digit([1-9])$/.exec(e.code);
      if (!m || modalOpen || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (typing && !e.altKey) return;
      const target = canvases[Number(m[1]) - 1];
      if (!target) return;
      e.preventDefault();
      switchTo(target.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pendingCanvas =
    pending?.kind === "canvas"
      ? c.canvases.find((x) => x.id === pending.id)
      : undefined;

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === "note") c.remove(pending.id);
    else c.removeCanvas(pending.id);
    setPending(null);
  };

  return (
    <>
      {view === "kanban" && (
        <main className="size-full bg-base-100">
          <KanbanBoard
            notes={c.notes}
            tags={c.allTags}
            selectedId={selectedId}
            focusId={focusId}
            onChange={c.update}
            onRemove={c.remove}
            onRequestDelete={(id) => setPending({ kind: "note", id })}
            onFocus={setSelectedId}
            tagOrder={c.tagOrder}
            onReorder={c.setTagOrder}
            onAdd={(tag) => {
              const { x, y } = freeSpot(c.notes);
              const id = c.add(x, y);
              c.update(id, { tag });
              setFocusId(id);
              setSelectedId(id);
            }}
          />
        </main>
      )}
      {view === "calendar" && (
        <main className="size-full bg-base-100">
          <CalendarView
            notes={c.notes}
            tags={c.allTags}
            selectedId={selectedId}
            focusId={focusId}
            onChange={c.update}
            onRemove={c.remove}
            onRequestDelete={(id) => setPending({ kind: "note", id })}
            onFocus={setSelectedId}
          />
        </main>
      )}
      {view === "canvas" && (
      <main
        className="relative size-full cursor-crosshair bg-base-100"
        onPointerDown={() => {
          // remember the selection before the blur of a draft note removes it
          hadSelection.current = selectedId !== null;
        }}
        onClick={(e) => {
          // a click on empty canvas first clears the selection; only then does it add a note
          if (hadSelection.current) {
            hadSelection.current = false;
            setSelectedId(null);
            setFocusId(null);
            (document.activeElement as HTMLElement | null)?.blur();
            return;
          }
          const x = Math.max(
            8,
            Math.min(window.innerWidth - NOTE_W - 8, e.clientX - NOTE_W / 2),
          );
          const y = Math.max(8, e.clientY - 12);
          const id = c.add(x, y);
          setFocusId(id);
          setSelectedId(id);
        }}
      >
        {c.notes.length === 0 && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-light text-base-content/25 select-none">
            Click anywhere to add a note
          </p>
        )}
        {c.notes.map((n) => (
          <StickyNote
            key={`${c.activeId}:${n.id}`}
            note={n}
            tags={c.allTags}
            autoFocus={n.id === focusId}
            selected={n.id === selectedId}
            onChange={c.update}
            onRemove={c.remove}
            onRequestDelete={(id) => setPending({ kind: "note", id })}
            onFocus={(id) => {
              setSelectedId(id);
              c.bringToFront(id);
            }}
          />
        ))}
      </main>
      )}

      <div className="join fixed top-3 right-14" style={{ zIndex: 1000000 }}>
        {(
          [
            ["canvas", "Canvas"],
            ["kanban", "Kanban"],
            ["calendar", "Calendar"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => showView(v)}
            className={`btn btn-sm join-item ${view === v ? "btn-primary" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <CanvasSwitcher
        canvases={c.canvases}
        activeId={c.activeId}
        onSwitch={switchTo}
        onAdd={(name) => {
          setFocusId(null);
          setSelectedId(null);
          c.addCanvas(name);
        }}
        onRename={c.renameCanvas}
        onRequestDelete={(id) => setPending({ kind: "canvas", id })}
      />

      <button
        aria-label="Settings"
        onClick={() => setSettingsOpen(true)}
        className="btn btn-ghost btn-sm btn-square fixed top-3 right-3 text-base-content/60 hover:text-base-content"
        style={{ zIndex: 1000000 }}
      >
        <LuSettings size={16} />
      </button>

      {settingsOpen && (
        <SettingsModal
          mode={mode}
          theme={theme}
          onMode={setMode}
          onTheme={setTheme}
          onExport={() =>
            downloadBackup(
              { canvases: c.canvases, activeId: c.activeId },
              themeState,
            )
          }
          onImport={(b: Backup) => {
            setFocusId(null);
            setSelectedId(null);
            c.replaceAll(b.canvas);
            if (b.theme) replaceTheme(b.theme);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {pending?.kind === "note" && (
        <ConfirmDialog
          title="Delete note?"
          message="This can't be undone."
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
      {pendingCanvas && (
        <ConfirmDialog
          title={`Delete “${pendingCanvas.name}”?`}
          message={`This canvas and its ${pendingCanvas.notes.length} note${pendingCanvas.notes.length === 1 ? "" : "s"} will be permanently deleted.`}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
