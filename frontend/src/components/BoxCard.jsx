import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/index'

const RARITY_COLORS = {
  common:    '#94a3b8',
  uncommon:  '#34d399',
  rare:      '#60a5fa',
  epic:      '#c084fc',
  legendary: '#fbbf24',
}

export default function BoxCard({ box }) {
  const { t } = useI18n()
  const topItems = (box.items || [])
    .sort((a, b) => b.product.retail_value - a.product.retail_value)
    .slice(0, 3)

  const isHot = box.total_openings >= 100

  return (
    <Link to={`/box/${box.id}`} className="hc-card">
      {/* Image */}
      <div className="hc-img-wrap">
        <img
          src={box.image_url}
          alt={box.name}
          loading="lazy"
          className="hc-img"
          onError={e => { e.target.src = '/placeholder.svg' }}
        />
        <span className="hc-cat">{box.category}</span>
        {isHot && <span className="hc-hot">🔥 {t('boxCard.hot')}</span>}
      </div>

      {/* Content */}
      <div className="hc-body">
        <div className="hc-top-row">
          <h3 className="hc-name">{box.name}</h3>
          <div className="hc-price-col">
            <span className="hc-price-lbl">{t('boxCard.openFor')}</span>
            <span className="hc-price">${box.price.toFixed(2)}</span>
          </div>
        </div>

        <p className="hc-desc">{box.description}</p>

        {topItems.length > 0 && (
          <div className="hc-chips">
            {topItems.map(item => (
              <span
                key={item.id}
                className="hc-chip"
                style={{
                  borderColor: RARITY_COLORS[item.product.rarity] || '#94a3b8',
                  color:       RARITY_COLORS[item.product.rarity] || '#94a3b8',
                }}
              >
                {item.product.name}
              </span>
            ))}
          </div>
        )}

        <div className="hc-footer">
          <div className="hc-stats">
            <span className="hc-stat">
              <span className="hc-stat-l">RTP</span>
              <span className="hc-stat-v rtp">{box.rtp_pct}%</span>
            </span>
            <span className="hc-divider" />
            <span className="hc-stat">
              <span className="hc-stat-l">APERTURAS</span>
              <span className="hc-stat-v">{box.total_openings.toLocaleString()}</span>
            </span>
          </div>
          <button className="hc-btn">
            {t('boxCard.open')} <span className="hc-btn-arrow">›</span>
          </button>
        </div>
      </div>
    </Link>
  )
}
