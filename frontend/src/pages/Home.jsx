import { useState, useEffect } from 'react'
import { api } from '../api/client'
import BoxCard from '../components/BoxCard'
import { useI18n } from '../i18n/index'
import { useTheme } from '../context/ThemeContext'

const CATEGORY_KEYS = ['all', 'tech', 'gaming', 'fashion', 'accessories']

const STEP_ICONS   = ['💳', '🎁', '🎰', '📦']
const STEP_DELAYS  = ['0s', '0.1s', '0.2s', '0.3s']

// Floating ? marks: [fontSize, top, left/right, animDelay, animDuration]
const QUESTIONS = [
  { size: '2.2rem',  top: '14%', left:  '6%',  delay: '0s',    dur: '3.1s' },
  { size: '1.3rem',  top: '68%', left:  '12%', delay: '0.7s',  dur: '2.7s' },
  { size: '2.6rem',  top: '18%', right: '8%',  delay: '1.3s',  dur: '3.6s' },
  { size: '1rem',    top: '72%', right: '18%', delay: '0.4s',  dur: '2.4s' },
  { size: '1.8rem',  top: '42%', left:  '4%',  delay: '1.9s',  dur: '4.1s' },
  { size: '1.2rem',  top: '55%', right: '4%',  delay: '1.0s',  dur: '3.3s' },
]

export default function Home() {
  const { t, lang } = useI18n()
  const { theme, clientId } = useTheme()
  const [boxes, setBoxes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (category !== 'all') params.category = category
    if (clientId && clientId !== 'default') params.client_id = clientId
    api.get('/boxes', { params })
      .then(res => setBoxes(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [category, clientId])

  const steps = t('home.steps')

  return (
    <div className="page">

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="hero">
        {/* Floating question marks */}
        <div className="hero-questions" aria-hidden="true">
          {QUESTIONS.map((q, i) => (
            <span
              key={i}
              className="hq"
              style={{
                fontSize: q.size,
                top: q.top,
                left: q.left,
                right: q.right,
                animationDelay: q.delay,
                animationDuration: q.dur,
              }}
            >?</span>
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-pill">🛡️ Premium &amp; Verificable</div>
          <h1 className="hero-title">
            {t('home.heroTitleLine1')}<br />
            <span className="gradient-text">
              {theme.heroLine2[lang] || theme.heroLine2.es}
            </span>
          </h1>
          <p className="hero-subtitle">{t('home.heroSubtitle')}</p>
          <div className="hero-badges">
            <span className="badge badge-green">{t('home.badgeFair')}</span>
            <span className="badge badge-blue">{t('home.badgeInstant')}</span>
            <span className="badge badge-gold">{t('home.badgeReal')}</span>
          </div>
        </div>

        <div className="hero-graphic">
          <div className="hero-glow-orb" aria-hidden="true" />
          <div className="box-3d">{theme.brandIcon}</div>
        </div>
      </section>

      {/* ── Cómo Funciona — numbered steps ──────────────────── */}
      {Array.isArray(steps) && (
        <section className="steps-section">
          <div className="steps-header">
            <span className="steps-star">✦</span>
            <h2>{t('home.howItWorks')}</h2>
            <span className="steps-star">✦</span>
          </div>
          <p className="steps-sub">{t('home.howItWorksSub')}</p>

          <div className="steps-row">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`step-block step-block-${i + 1}`}
                style={{ animationDelay: STEP_DELAYS[i] }}
              >
                <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="step-ico-wrap">{STEP_ICONS[i]}</div>
                <h3 className="step-block-title">{step.title}</h3>
                <p className="step-block-desc">{step.desc}</p>
                {i < steps.length - 1 && (
                  <span className="step-arrow" aria-hidden="true">›</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Cajas ───────────────────────────────────────────── */}
      <section className="section">
        <div className="filter-bar">
          {CATEGORY_KEYS.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {t(`home.categories.${cat}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid-skeleton">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        ) : boxes.length === 0 ? (
          <div className="empty-state">{t('home.noBoxes')}</div>
        ) : (
          <div className="boxes-grid">
            {boxes.map(box => <BoxCard key={box.id} box={box} />)}
          </div>
        )}
      </section>
    </div>
  )
}
