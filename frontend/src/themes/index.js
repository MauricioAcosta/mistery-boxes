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
      '--accent':        '#7c3aed',
      '--accent-light':  '#9d5cf6',
      '--accent-glow':   'rgba(124, 58, 237, 0.35)',
      '--bg-base':       '#0d0d0f',
      '--bg-surface':    '#16161a',
      '--bg-card':       '#1e1e24',
      '--bg-hover':      '#26262e',
      '--border':        '#2e2e38',
      '--border-light':  '#3a3a48',
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
      '--accent':        '#FF6900',
      '--accent-light':  '#FF8C3A',
      '--accent-glow':   'rgba(255, 105, 0, 0.35)',
      '--bg-base':       '#0a0a0a',
      '--bg-surface':    '#141414',
      '--bg-card':       '#1c1c1c',
      '--bg-hover':      '#242424',
      '--border':        '#2a2a2a',
      '--border-light':  '#383838',
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
      '--accent':        '#1D8DDB',
      '--accent-light':  '#4AA8F0',
      '--accent-glow':   'rgba(29, 141, 219, 0.35)',
      '--bg-base':       '#050d1a',
      '--bg-surface':    '#0a1628',
      '--bg-card':       '#0f1e38',
      '--bg-hover':      '#142448',
      '--border':        '#1e3060',
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
      '--accent':        '#0066CC',
      '--accent-light':  '#3399FF',
      '--accent-glow':   'rgba(0, 102, 204, 0.35)',
      '--bg-base':       '#030c1a',
      '--bg-surface':    '#071020',
      '--bg-card':       '#0c1830',
      '--bg-hover':      '#112040',
      '--border':        '#1a2a50',
      '--border-light':  '#243360',
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
      '--accent':        '#1428A0',
      '--accent-light':  '#3355DD',
      '--accent-glow':   'rgba(20, 40, 160, 0.35)',
      '--bg-base':       '#040914',
      '--bg-surface':    '#080f1e',
      '--bg-card':       '#0d1830',
      '--bg-hover':      '#122040',
      '--border':        '#1a2a50',
      '--border-light':  '#243060',
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
      '--accent':        '#FFD700',
      '--accent-light':  '#FFE44D',
      '--accent-glow':   'rgba(255, 215, 0, 0.35)',
      '--bg-base':       '#0a0800',
      '--bg-surface':    '#140f00',
      '--bg-card':       '#1c1600',
      '--bg-hover':      '#251e00',
      '--border':        '#332a00',
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
