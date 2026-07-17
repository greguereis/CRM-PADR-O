import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // ===== ESTADO =====
  const [isDark, setIsDark] = useState(() => {
    // Verifica preferência salva no localStorage
    const saved = localStorage.getItem('parhub-theme')
    if (saved) return saved === 'dark'
    // Se não tiver salvo, verifica preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // ===== APLICAR TEMA NO HTML =====
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('parhub-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('parhub-theme', 'light')
    }
  }, [isDark])

  // ===== TOGGLE =====
  const toggle = () => setIsDark(prev => !prev)

  // ===== SETAR TEMA ESPECÍFICO =====
  const setTheme = (theme) => {
    if (theme === 'dark') setIsDark(true)
    else if (theme === 'light') setIsDark(false)
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}