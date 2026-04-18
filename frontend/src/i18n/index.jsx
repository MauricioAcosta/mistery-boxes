import { createContext, useContext, useState, useCallback } from 'react'
import { es } from './es'
import { en } from './en'

const TRANSLATIONS = { es, en }
const DEFAULT_LANG = 'es'

const I18nContext = createContext(null)

/** Resolve a dot-path key like "nav.boxes" against a translations object. */
function resolve(obj, key) {
  return key.split('.').reduce((acc, k) => acc?.[k], obj)
}

/**
 * Replace {{varName}} placeholders in a string.
 * e.g. t('wallet.added', { amount: '5.00' }) with "{{amount}} añadido"
 */
function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? `{{${k}}}`))
}

export function I18nProvider({ children }) {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('mb_lang') : null
  const [lang, setLangState] = useState(stored || DEFAULT_LANG)

  const setLang = useCallback((l) => {
    if (!TRANSLATIONS[l]) return
    localStorage.setItem('mb_lang', l)
    setLangState(l)
  }, [])

  /** Main translate function. Supports dot-paths and {{var}} interpolation. */
  const t = useCallback((key, vars) => {
    const val = resolve(TRANSLATIONS[lang], key) ?? resolve(TRANSLATIONS[DEFAULT_LANG], key) ?? key
    if (typeof val !== 'string') return val   // arrays / objects returned as-is
    return interpolate(val, vars)
  }, [lang])

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
