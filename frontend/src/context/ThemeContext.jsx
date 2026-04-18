import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { themes, resolveClientId } from '../themes/index'

const ThemeContext = createContext(null)

/** Apply a theme's color tokens to the document root as CSS custom properties. */
function applyTheme(theme) {
  const root = document.documentElement
  Object.entries(theme.colors).forEach(([prop, val]) => {
    root.style.setProperty(prop, val)
  })
  // Also expose the client id as a data-attribute for any CSS selectors
  root.setAttribute('data-client', theme.id)
}

export function ThemeProvider({ children }) {
  const [clientId, setClientIdState] = useState(resolveClientId)
  const theme = themes[clientId] || themes.default

  // Apply CSS vars whenever the theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setClient = useCallback((id) => {
    if (!themes[id]) return
    localStorage.setItem('mb_client', id)
    setClientIdState(id)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, clientId, setClient }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
