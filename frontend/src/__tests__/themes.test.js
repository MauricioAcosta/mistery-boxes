/**
 * Unit tests for the client theme system.
 */
import { describe, it, expect } from 'vitest'
import { themes, CLIENT_IDS, resolveClientId } from '../themes/index'

describe('Theme definitions', () => {
  it('exports the expected client IDs', () => {
    expect(CLIENT_IDS).toContain('default')
    expect(CLIENT_IDS).toContain('xiaomi')
    expect(CLIENT_IDS).toContain('oppo')
    expect(CLIENT_IDS).toContain('motorola')
    expect(CLIENT_IDS).toContain('samsung')
    expect(CLIENT_IDS).toContain('realme')
  })

  it('every theme has required fields', () => {
    CLIENT_IDS.forEach(id => {
      const theme = themes[id]
      expect(theme, `theme "${id}" should exist`).toBeDefined()
      expect(theme.id).toBe(id)
      expect(typeof theme.brandName).toBe('string')
      expect(typeof theme.brandIcon).toBe('string')
      expect(theme.heroLine2).toHaveProperty('es')
      expect(theme.heroLine2).toHaveProperty('en')
      expect(theme.tagline).toHaveProperty('es')
      expect(theme.tagline).toHaveProperty('en')
    })
  })

  it('every theme has the 9 required CSS custom properties', () => {
    const requiredProps = [
      '--accent', '--accent-light', '--accent-glow',
      '--bg-base', '--bg-surface', '--bg-card', '--bg-hover',
      '--border', '--border-light',
    ]
    CLIENT_IDS.forEach(id => {
      requiredProps.forEach(prop => {
        expect(
          themes[id].colors[prop],
          `theme "${id}" missing CSS var "${prop}"`,
        ).toBeDefined()
      })
    })
  })

  it('accent colors are valid CSS color values', () => {
    CLIENT_IDS.forEach(id => {
      const accent = themes[id].colors['--accent']
      // Should be hex (#RRGGBB) or rgb/rgba
      expect(accent).toMatch(/^#[0-9a-fA-F]{6}$|^rgba?\(/)
    })
  })

  it('all client IDs are consistent between CLIENT_IDS and themes keys', () => {
    expect(CLIENT_IDS).toEqual(Object.keys(themes))
  })
})

describe('resolveClientId', () => {
  it('returns "default" when nothing is set', () => {
    // localStorage is empty in jsdom by default
    localStorage.clear()
    const id = resolveClientId()
    expect(id).toBe('default')
  })

  it('returns stored client when set in localStorage', () => {
    localStorage.setItem('mb_client', 'xiaomi')
    expect(resolveClientId()).toBe('xiaomi')
    localStorage.clear()
  })

  it('falls back to "default" for unknown client IDs', () => {
    localStorage.setItem('mb_client', 'unknown_brand_xyz')
    expect(resolveClientId()).toBe('default')
    localStorage.clear()
  })
})
