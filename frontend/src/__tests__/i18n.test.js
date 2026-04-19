/**
 * Unit tests for the i18n module.
 *
 * Tests the translation lookup, interpolation, language switching,
 * and fallback behaviour WITHOUT mounting any React components.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { es } from '../i18n/es'
import { en } from '../i18n/en'

// Minimal re-implementation of the resolve + interpolate logic
// (mirrors what I18nContext does, but without React hooks)
function resolve(obj, key) {
  return key.split('.').reduce((acc, k) => acc?.[k], obj)
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? `{{${k}}}`))
}

function t(lang, key, vars) {
  const translations = { es, en }
  const val =
    resolve(translations[lang], key) ??
    resolve(translations['es'],  key) ??
    key
  if (typeof val !== 'string') return val
  return interpolate(val, vars)
}


describe('i18n — Spanish translations', () => {
  it('resolves simple nav keys', () => {
    expect(t('es', 'nav.boxes')).toBe('Cajas')
    expect(t('es', 'nav.login')).toBe('Iniciar sesión')
    expect(t('es', 'nav.logout')).toBe('Cerrar sesión')
  })

  it('resolves nested auth keys', () => {
    expect(t('es', 'auth.welcomeBack')).toBe('Bienvenido de nuevo')
    expect(t('es', 'auth.createAccountBtn')).toBe('Crear Cuenta')
    expect(t('es', 'auth.passwordTooShort')).toContain('8')
  })

  it('resolves rarity keys', () => {
    expect(t('es', 'rarity.common')).toBe('Común')
    expect(t('es', 'rarity.legendary')).toBe('Legendario')
  })

  it('interpolates {{amount}} in prize.exchangeBtn', () => {
    const result = t('es', 'prize.exchangeBtn', { amount: '9.00' })
    expect(result).toContain('9.00')
    expect(result).not.toContain('{{amount}}')
  })

  it('interpolates {{amount}} in wallet.addedSuccess', () => {
    const result = t('es', 'wallet.addedSuccess', { amount: '50.00' })
    expect(result).toContain('50.00')
  })

  it('interpolates {{page}} and {{total}} in history.pageOf', () => {
    const result = t('es', 'history.pageOf', { page: 2, total: 5 })
    expect(result).toContain('2')
    expect(result).toContain('5')
  })

  it('interpolates {{amount}} in boxDetail.needMore', () => {
    const result = t('es', 'boxDetail.needMore', { amount: '5.00' })
    expect(result).toContain('5.00')
    expect(result).not.toContain('{{amount}}')
  })

  it('returns arrays for home.steps', () => {
    const steps = t('es', 'home.steps')
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBe(4)
    expect(steps[0]).toHaveProperty('title')
    expect(steps[0]).toHaveProperty('desc')
  })

  it('returns arrays for verify.steps', () => {
    const steps = t('es', 'verify.steps')
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBe(4)
    steps.forEach(s => expect(typeof s).toBe('string'))
  })

  it('status labels include emoji', () => {
    expect(t('es', 'history.status.pending')).toContain('⏳')
    expect(t('es', 'history.status.exchanged')).toContain('💰')
    expect(t('es', 'history.status.shipped')).toContain('📦')
  })
})


describe('i18n — English translations', () => {
  it('resolves simple nav keys', () => {
    expect(t('en', 'nav.boxes')).toBe('Boxes')
    expect(t('en', 'nav.login')).toBe('Login')
    expect(t('en', 'nav.logout')).toBe('Logout')
  })

  it('resolves auth keys', () => {
    expect(t('en', 'auth.welcomeBack')).toBe('Welcome back')
    expect(t('en', 'auth.signIn')).toBe('Sign In')
  })

  it('resolves prize.exchangeBtn with interpolation', () => {
    const result = t('en', 'prize.exchangeBtn', { amount: '45.00' })
    expect(result).toContain('45.00')
    expect(result).not.toContain('{{amount}}')
  })

  it('has matching keys with Spanish', () => {
    const navKeys = ['boxes', 'verify', 'history', 'logout', 'login', 'signup']
    navKeys.forEach(k => {
      expect(t('en', `nav.${k}`)).not.toBe(`nav.${k}`)
      expect(t('es', `nav.${k}`)).not.toBe(`nav.${k}`)
    })
  })
})


describe('i18n — Fallback behaviour', () => {
  it('falls back to key string for unknown key', () => {
    expect(t('es', 'nonexistent.key')).toBe('nonexistent.key')
  })

  it('leaves unmatched {{var}} placeholder intact', () => {
    // If we pass vars but they don't match the template variable
    const raw = t('es', 'prize.exchangeBtn', { wrongVar: '9.00' })
    expect(raw).toContain('{{amount}}')
  })
})
