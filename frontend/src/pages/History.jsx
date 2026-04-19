import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useI18n } from '../i18n/index'

const RARITY_COLORS = {
  common: '#6b7280', uncommon: '#22c55e',
  rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}

const STATUS_CLASS = {
  pending: 'status-pending',
  exchanged: 'status-exchanged',
  shipped: 'status-shipped',
}

export default function History() {
  const { t } = useI18n()
  const [openings, setOpenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/openings', { params: { page, per_page: 20 } })
      .then(res => {
        setOpenings(res.data.openings)
        setTotalPages(res.data.pages)
        setTotal(res.data.total)
      })
      .catch(() => setError(t('history.failedLoad')))
      .finally(() => setLoading(false))
  }, [page])

  const totalSpent = openings.reduce((s, o) => s + o.amount_paid, 0)
  const totalExchanged = openings
    .filter(o => o.status === 'exchanged')
    .reduce((s, o) => s + (o.exchange_amount || 0), 0)
  const pendingCount = openings.filter(o => o.status === 'pending').length

  return (
    <div className="page history-page">
      <h1 className="page-title">{t('history.title')}</h1>

      {/* Summary stats */}
      <div className="history-stats">
        <div className="history-stat-card">
          <div className="history-stat-label">{t('history.totalOpens')}</div>
          <div className="history-stat-value">{total}</div>
        </div>
        <div className="history-stat-card">
          <div className="history-stat-label">{t('history.spent')}</div>
          <div className="history-stat-value">${totalSpent.toFixed(2)}</div>
        </div>
        <div className="history-stat-card">
          <div className="history-stat-label">{t('history.exchanged')}</div>
          <div className="history-stat-value" style={{ color: 'var(--green)' }}>${totalExchanged.toFixed(2)}</div>
        </div>
        <div className="history-stat-card">
          <div className="history-stat-label">{t('history.pending')}</div>
          <div className="history-stat-value" style={{ color: 'var(--gold)' }}>{pendingCount}</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : openings.length === 0 ? (
        <div className="empty-state">
          <p>{t('history.noOpenings')}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
            {t('history.browseBoxes')}
          </Link>
        </div>
      ) : (
        <>
          <div className="openings-list">
            {openings.map(opening => (
              <OpeningCard key={opening.id} opening={opening} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('history.prev')}
              </button>
              <span className="pagination-info">
                {t('history.pageOf', { page, total: totalPages })}
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {t('history.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OpeningCard({ opening }) {
  const { t } = useI18n()
  const product = opening.product
  const rarity = product?.rarity || 'common'
  const rarityColor = RARITY_COLORS[rarity]

  return (
    <div className="opening-card">
      <img
        src={product?.image_url}
        alt={product?.name}
        className="opening-product-img"
      />

      <div className="opening-info">
        <div className="opening-product-name" style={{ color: rarityColor }}>
          {product?.name}
        </div>
        <div className="opening-box-name">{t('history.from')} {opening.box_name}</div>

        <div className="opening-meta">
          <span className={`opening-status ${STATUS_CLASS[opening.status] || 'status-pending'}`}>
            {t(`history.status.${opening.status}`) || opening.status}
          </span>
          <span className="opening-date">
            {new Date(opening.created_at).toLocaleString()}
          </span>
        </div>

        <div className="opening-proof" style={{ marginTop: '0.5rem' }}>
          <details>
            <summary>{t('history.proof')}</summary>
            <div className="proof-grid">
              <span>{t('history.serverSeed')}</span>
              <code>{opening.proof.server_seed}</code>
              <span>{t('history.clientSeed')}</span>
              <code>{opening.proof.client_seed}</code>
              <span>{t('history.nonce')}</span>
              <code>{opening.proof.nonce}</code>
              <span>{t('history.result')}</span>
              <code>{opening.proof.result_float.toFixed(8)}</code>
            </div>
          </details>
        </div>
      </div>

      <div className="opening-right">
        <span className="opening-value">${product?.retail_value?.toFixed(2)}</span>
        <span className="opening-paid">{t('history.paid')} ${opening.amount_paid.toFixed(2)}</span>
        {opening.status === 'exchanged' && opening.exchange_amount && (
          <span style={{ fontSize: '0.78rem', color: 'var(--green)' }}>
            +${opening.exchange_amount.toFixed(2)} {t('history.credited')}
          </span>
        )}
      </div>
    </div>
  )
}
