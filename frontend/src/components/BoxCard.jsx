import { Link } from 'react-router-dom'

const RARITY_COLORS = {
  common: '#6b7280',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

export default function BoxCard({ box }) {
  const topItems = (box.items || [])
    .sort((a, b) => b.product.retail_value - a.product.retail_value)
    .slice(0, 4)

  return (
    <Link to={`/box/${box.id}`} className="box-card">
      <div className="box-card-image">
        <img src={box.image_url} alt={box.name} loading="lazy" />
        <div className="box-card-category">{box.category}</div>
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
                style={{ borderColor: RARITY_COLORS[item.product.rarity] || '#6b7280' }}
                title={item.product.name}
              >
                <span
                  className="item-chip-dot"
                  style={{ background: RARITY_COLORS[item.product.rarity] || '#6b7280' }}
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
            <span className="stat-label">Openings</span>
            <span className="stat-value">{box.total_openings.toLocaleString()}</span>
          </span>
        </div>
        <div className="box-price">
          <span className="price-label">Open for</span>
          <span className="price-value">${box.price.toFixed(2)}</span>
        </div>
      </div>
    </Link>
  )
}
