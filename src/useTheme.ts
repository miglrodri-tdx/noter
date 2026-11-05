import { useEffect, useState } from 'react'
import { THEMES, THEME_KEY, activeTheme, initialTheme, type Mode } from './themes'

export function useTheme() {
  const [state, setState] = useState(initialTheme)
  const theme = activeTheme(state)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state, theme])

  const setMode = (mode: Mode) => setState((s) => ({ ...s, mode }))
  // picking a theme also switches to its mode
  const setTheme = (id: string) => {
    const t = THEMES.find((x) => x.id === id)
    if (t) setState((s) => ({ ...s, mode: t.mode, [t.mode]: id }))
  }

  return { state, mode: state.mode, theme, setMode, setTheme, replace: setState }
}
