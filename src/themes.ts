export type Mode = 'light' | 'dark'

export interface ThemeDef {
  id: string
  label: string
  mode: Mode
}

// "noter" / "noter-dark" are defined in index.css; the rest come from
// https://github.com/dachinat/daisyui-themes (CC BY 4.0).
export const THEMES: ThemeDef[] = [
  { id: 'githublight', label: 'GitHub Light', mode: 'light' },
  { id: 'noter', label: 'Noter', mode: 'light' },

  { id: 'githubdark', label: 'GitHub Dark', mode: 'dark' },
  { id: 'noter-dark', label: 'Noter Dark', mode: 'dark' },
  { id: 'andromeda', label: 'Andromeda', mode: 'dark' },
  { id: 'ayudark', label: 'Ayu Dark', mode: 'dark' },
  { id: 'catppuccin', label: 'Catppuccin', mode: 'dark' },
  { id: 'everforest', label: 'Everforest', mode: 'dark' },
  { id: 'flexoki', label: 'Flexoki', mode: 'dark' },
  { id: 'gruvbox', label: 'Gruvbox', mode: 'dark' },
  { id: 'kanagawa', label: 'Kanagawa', mode: 'dark' },
  { id: 'monokai', label: 'Monokai', mode: 'dark' },
  { id: 'nightfox', label: 'Nightfox', mode: 'dark' },
  { id: 'nightowl', label: 'Night Owl', mode: 'dark' },
  { id: 'onedarkpro', label: 'One Dark Pro', mode: 'dark' },
  { id: 'rosepine', label: 'Rosé Pine', mode: 'dark' },
  { id: 'solarized', label: 'Solarized', mode: 'dark' },
  { id: 'tokyonight', label: 'Tokyo Night', mode: 'dark' },
  { id: 'vscode', label: 'VS Code', mode: 'dark' },
]

export interface ThemeState {
  mode: Mode
  light: string // theme chosen for light mode
  dark: string // theme chosen for dark mode
}

export const THEME_KEY = 'noter:theme:v2'
const LEGACY_KEY = 'noter:theme'
export const DEFAULTS = { light: 'githublight', dark: 'githubdark' }

const find = (id: unknown) => THEMES.find((t) => t.id === id)

export function activeTheme(s: ThemeState): string {
  return s[s.mode]
}

/** Validates a stored/imported theme state; null when it holds nothing usable. */
export function parseThemeState(p: unknown, base?: ThemeState): ThemeState | null {
  const v = p as Partial<ThemeState> | null
  if (!v || typeof v !== 'object') return null
  const state: ThemeState = { ...(base ?? { mode: 'light', ...DEFAULTS }) }
  let ok = false
  if (v.mode === 'light' || v.mode === 'dark') (state.mode = v.mode), (ok = true)
  if (find(v.light)?.mode === 'light') (state.light = v.light as string), (ok = true)
  if (find(v.dark)?.mode === 'dark') (state.dark = v.dark as string), (ok = true)
  return ok ? state : null
}

export function initialTheme(): ThemeState {
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const state: ThemeState = { mode: systemDark ? 'dark' : 'light', ...DEFAULTS }
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw) return parseThemeState(JSON.parse(raw), state) ?? state
    // migrate the single-theme value saved by the previous version
    const old = find(localStorage.getItem(LEGACY_KEY))
    if (old) {
      state.mode = old.mode
      state[old.mode] = old.id
    }
  } catch {
    /* ignore */
  }
  return state
}
