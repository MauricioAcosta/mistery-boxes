/**
 * Client theme definitions.
 *
 * Each theme overrides CSS custom properties declared in index.css.
 * To deploy for a specific client set VITE_CLIENT_ID in your .env file,
 * e.g.:  VITE_CLIENT_ID=xiaomi
 *
 * Available clients: default | xiaomi | oppo | motorola | samsung | realme
 */

export const themes = {
  /* ── Default / Generic ─────────────────────────────────── */
  default: {
    id: 'default',
    brandName: 'MysteryBoxes',
    brandIcon: '🎁',
    heroLine2: { es: 'Caja Misterio', en: 'Mystery Box' },
    tagline:   { es: 'Cajas Misterio Premium', en: 'Premium Mystery Boxes' },
    colors: {
      '--accent':        '#8b5cf6',
      '--accent-light':  '#a78bfa',
      '--accent-glow':   'rgba(139, 92, 246, 0.50)',
      '--bg-base':       '#0d0d0f',
      '--bg-surface':    '#18181f',
      '--bg-card':       '#20202a',
      '--bg-hover':      '#2a2a38',
      '--border':        '#32324a',
      '--border-light':  '#3e3e58',
    },
  },

  /* ── Xiaomi ─────────────────────────────────────────────── */
  xiaomi: {
    id: 'xiaomi',
    brandName: 'Xiaomi Boxes',
    brandIcon: '📱',
    heroLine2: { es: 'Caja Xiaomi', en: 'Xiaomi Box' },
    tagline:   { es: 'Descubre Tu Próximo Gadget', en: 'Discover Your Next Gadget' },
    colors: {
      '--accent':        '#FF4500',
      '--accent-light':  '#FF6A1A',
      '--accent-glow':   'rgba(255, 69, 0, 0.55)',
      '--bg-base':       '#0c0c0c',
      '--bg-surface':    '#161616',
      '--bg-card':       '#1e1e1e',
      '--bg-hover':      '#262626',
      '--border':        '#2e2e2e',
      '--border-light':  '#3c3c3c',
    },
  },

  /* ── OPPO ───────────────────────────────────────────────── */
  oppo: {
    id: 'oppo',
    brandName: 'OPPO Surprise',
    brandIcon: '📲',
    heroLine2: { es: 'Caja OPPO', en: 'OPPO Box' },
    tagline:   { es: 'Sorpréndete con OPPO', en: 'Get Surprised by OPPO' },
    colors: {
      '--accent':        '#0EA5E9',
      '--accent-light':  '#38BDF8',
      '--accent-glow':   'rgba(14, 165, 233, 0.55)',
      '--bg-base':       '#05101e',
      '--bg-surface':    '#0a1a2e',
      '--bg-card':       '#0f2040',
      '--bg-hover':      '#142852',
      '--border':        '#1e3464',
      '--border-light':  '#284080',
    },
  },

  /* ── Motorola ───────────────────────────────────────────── */
  motorola: {
    id: 'motorola',
    brandName: 'Motorola Drops',
    brandIcon: '📡',
    heroLine2: { es: 'Caja Motorola', en: 'Motorola Box' },
    tagline:   { es: 'Abre Tu Moto Caja', en: 'Open Your Moto Box' },
    colors: {
      '--accent':        '#2563EB',
      '--accent-light':  '#60A5FA',
      '--accent-glow':   'rgba(37, 99, 235, 0.55)',
      '--bg-base':       '#04101e',
      '--bg-surface':    '#081526',
      '--bg-card':       '#0d1e36',
      '--bg-hover':      '#122648',
      '--border':        '#1a2e58',
      '--border-light':  '#243868',
    },
  },

  /* ── Samsung ────────────────────────────────────────────── */
  samsung: {
    id: 'samsung',
    brandName: 'Samsung Galaxy Boxes',
    brandIcon: '💎',
    heroLine2: { es: 'Caja Galaxy', en: 'Galaxy Box' },
    tagline:   { es: 'Descubre el Universo Galaxy', en: 'Discover the Galaxy Universe' },
    colors: {
      '--accent':        '#1D4ED8',
      '--accent-light':  '#3B82F6',
      '--accent-glow':   'rgba(29, 78, 216, 0.60)',
      '--bg-base':       '#040a18',
      '--bg-surface':    '#081022',
      '--bg-card':       '#0d1832',
      '--bg-hover':      '#122044',
      '--border':        '#1a2a54',
      '--border-light':  '#243464',
    },
  },

  /* ── Realme ─────────────────────────────────────────────── */
  realme: {
    id: 'realme',
    brandName: 'Realme Boxes',
    brandIcon: '⚡',
    heroLine2: { es: 'Caja Realme', en: 'Realme Box' },
    tagline:   { es: 'Potencia Tu Estilo', en: 'Power Up Your Style' },
    colors: {
      '--accent':        '#F59E0B',
      '--accent-light':  '#FCD34D',
      '--accent-glow':   'rgba(245, 158, 11, 0.55)',
      '--bg-base':       '#0c0900',
      '--bg-surface':    '#161200',
      '--bg-card':       '#1e1800',
      '--bg-hover':      '#272000',
      '--border':        '#352a00',
      '--border-light':  '#443800',
    },
  },
}

/** All client IDs in order for the demo switcher. */
export const CLIENT_IDS = Object.keys(themes)

/**
 * Resolve which theme to use.
 * Priority: localStorage override → VITE_CLIENT_ID env var → 'default'
 */
export function resolveClientId() {
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem('mb_client')
    : null
  const envId = import.meta.env.VITE_CLIENT_ID
  const id = stored || envId || 'default'
  return themes[id] ? id : 'default'
}
