import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // Prefer stored theme if available, otherwise default to light
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored) return stored
    } catch (e) {}
    return 'light'
  })

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme)
    } catch (e) {}
    const root = document.documentElement
    try {
      root.setAttribute('data-theme', theme)
    } catch (e) {
      if (theme === 'dark') root.classList.add('dark')
      else root.classList.remove('dark')
    }
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export default ThemeContext
