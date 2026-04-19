import { useState, useEffect } from 'react'
import { api } from '../api/client'
import BoxCard from '../components/BoxCard'
import { useI18n } from '../i18n/index'
import { useTheme } from '../context/ThemeContext'

const CATEGORY_KEYS = ['all', 'tech', 'gaming', 'fashion', 'accessories']

export default function Home() {
  const { t, lang } = useI18n()
  const { theme, clientId } = useTheme()
  const [boxes, setBoxes] = useState([])
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

  const steps = t('home.steps')   // returns the array directly

  return (
    <div className="page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
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
          <div className="box-3d">{theme.brandIcon}</div>
        </div>
      </section>

      {/* Category filter */}
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
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        ) : boxes.length === 0 ? (
          <div className="empty-state">{t('home.noBoxes')}</div>
        ) : (
          <div className="boxes-grid">
            {boxes.map(box => <BoxCard key={box.id} box={box} />)}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="section how-it-works">
        <h2 className="section-title">{t('home.howItWorks')}</h2>
        <div className="steps-grid">
          {Array.isArray(steps) && steps.map((step, i) => (
            <div key={i} className="step-card">
              <div className="step-icon">{['💳', '🎁', '🎰', '📦'][i]}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
