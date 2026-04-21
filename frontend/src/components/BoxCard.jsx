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
    .slice(0, 4)

  const isHot = box.total_openings >= 100

  return (
    <Link to={`/box/${box.id}`} className="box-card">
      <div className="box-card-image">
        <img
          src={box.image_url}
          alt={box.name}
          loading="lazy"
          onError={e => { e.target.src = '/placeholder.svg' }}
        />
        <div className="box-card-category">{box.category}</div>
        {isHot && <div className="box-card-hot">🔥 {t('boxCard.hot')}</div>}
        <div className="box-card-price-tag">
          <span className="price-tag-label">{t('boxCard.openFor')}</span>
          <span className="price-tag-value">${box.price.toFixed(2)}</span>
        </div>
      </div>

      <div className="box-card-body">
        <h3 className="box-card-name">{box.name}</h3>
        <p className="box-card-desc">{box.description}</p>

        {topItems.length > 0 && (
          <div className="box-card-items">
            {topItems.map(item => (
              <div
                key={item.id}
                className="item-chip"
                style={{ borderColor: RARITY_COLORS[item.product.rarity] || '#94a3b8' }}
                title={item.product.name}
              >
                <span
                  className="item-chip-dot"
                  style={{ background: RARITY_COLORS[item.product.rarity] || '#94a3b8' }}
                />
                <span className="item-chip-name">{item.product.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="box-card-footer">
        <div className="box-stats">
          <span className="stat">
            <span className="stat-label">RTP</span>
            <span className="stat-value rtp">{box.rtp_pct}%</span>
          </span>
          <span className="stat">
            <span className="stat-label">Aperturas</span>
            <span className="stat-value">{box.total_openings.toLocaleString()}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
