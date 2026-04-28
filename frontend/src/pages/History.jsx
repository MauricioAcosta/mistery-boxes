import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/index'

const RARITY_COLORS = {
  common: '#6b7280', uncommon: '#22c55e',
  rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}

const STATUS_CLASS = {
  pending:   'status-pending',
  exchanged: 'status-exchanged',
  shipped:   'status-shipped',
}

const EMPTY_ADDR = { full_name: '', address: '', city: '', country: '', postal_code: '' }

export default function History() {
  const { t } = useI18n()
  const [openings, setOpenings]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [total, setTotal]               = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError]               = useState('')
  const [actionMsg, setActionMsg]       = useState('')

  const load = useCallback((p = 1, st = statusFilter) => {
    setLoading(true)
    setError('')
    const params = { page: p, per_page: 20 }
    if (st) params.status = st
    api.get('/openings', { params })
      .then(res => {
        setOpenings(res.data.openings)
        setTotalPages(res.data.pages)
        setTotal(res.data.total)
      })
      .catch(() => setError(t('history.failedLoad')))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load(page, statusFilter) }, [page, statusFilter])

  const handleFilter = (st) => { setStatusFilter(st); setPage(1) }

  const onAction = (msg) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 3500)
    load(page, statusFilter)
  }

  const totalSpent     = openings.reduce((s, o) => s + o.amount_paid, 0)
  const totalExchanged = openings
    .filter(o => o.status === 'exchanged')
    .reduce((s, o) => s + (o.exchange_amount || 0), 0)
  const pendingCount   = openings.filter(o => o.status === 'pending').length

  const filterTabs = [
    { key: '',          label: t('history.filterAll') },
    { key: 'pending',   label: t('history.filterPending') },
    { key: 'exchanged', label: t('history.filterExchanged') },
    { key: 'shipped',   label: t('history.filterShipped') },
  ]

  return (
    <div className="page history-page">
      <h1 className="page-title">{t('history.title')}</h1>

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
        <div className="history-stat-card history-stat-card--pending"
          onClick={() => handleFilter('pending')} style={{ cursor: 'pointer' }}>
          <div className="history-stat-label">{t('history.pending')}</div>
          <div className="history-stat-value" style={{ color: 'var(--gold)' }}>{pendingCount}</div>
        </div>
      </div>

      <div className="history-filter-tabs">
        {filterTabs.map(tab => (
          <button key={tab.key}
            className={`history-filter-tab${statusFilter === tab.key ? ' active' : ''}`}
            onClick={() => handleFilter(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {actionMsg && <div className="alert alert-success">{actionMsg}</div>}
      {error     && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : openings.length === 0 ? (
        <div className="empty-state">
          <p>{statusFilter ? t('history.noOpeningsFilter') : t('history.noOpenings')}</p>
          {!statusFilter && (
            <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
              {t('history.browseBoxes')}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="openings-list">
            {openings.map(opening => (
              <OpeningCard key={opening.id} opening={opening} onAction={onAction} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                {t('history.prev')}
              </button>
              <span className="pagination-info">
                {t('history.pageOf', { page, total: totalPages })}
              </span>
              <button className="btn btn-outline btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                {t('history.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OpeningCard({ opening, onAction }) {
  const { t } = useI18n()
  const { setWallet } = useAuth()
  const [busy, setBusy]         = useState(false)
  const [showShip, setShowShip] = useState(false)
  const [addr, setAddr]         = useState(EMPTY_ADDR)
  const [shipErr, setShipErr]   = useState('')

  const product   = opening.product
  const rarity    = product?.rarity || 'common'
  const isPending = opening.status === 'pending'
  const retail    = product?.retail_value || 0
  const exchAmt   = (retail * 0.70).toFixed(2)

  const handleExchange = async () => {
    setBusy(true)
    try {
      const r = await api.post('/exchange', { opening_id: opening.id })
      setWallet(w => ({ ...w, balance: r.data.wallet_balance }))
      onAction(t('history.actionExchangeOk', { amount: r.data.exchange_amount.toFixed(2) }))
    } catch { onAction(t('history.actionFailed')) }
    finally { setBusy(false) }
  }

  const handleShip = async (e) => {
    e.preventDefault()
    setShipErr('')
    setBusy(true)
    try {
      const r = await api.post('/ship', { opening_id: opening.id, ...addr })
      setWallet(w => ({ ...w, balance: r.data.wallet_balance }))
      setShowShip(false)
      onAction(t('history.actionShipOk'))
    } catch (err) {
      setShipErr(err.response?.data?.error || t('history.actionFailed'))
    } finally { setBusy(false) }
  }

  return (
    <>
      <div className={`opening-card${isPending ? ' opening-card--pending' : ''}`}>
        <img src={product?.image_url || '/placeholder.svg'} alt={product?.name}
          className="opening-product-img"
          onError={e => { e.target.src = '/placeholder.svg' }} />

        <div className="opening-info">
          <div className="opening-product-name" style={{ color: RARITY_COLORS[rarity] }}>
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

          {isPending && (
            <div className="opening-actions">
              <button className="btn btn-sm btn-primary opening-action-btn"
                disabled={busy} onClick={handleExchange}>
                💰 {t('history.actionExchange', { amount: exchAmt })}
              </button>
              <button className="btn btn-sm btn-ghost opening-action-btn"
                disabled={busy} onClick={() => setShowShip(true)}>
                📦 {t('history.actionShip')}
              </button>
            </div>
          )}

          <div className="opening-proof" style={{ marginTop: '0.5rem' }}>
            <details>
              <summary>{t('history.proof')}</summary>
              <div className="proof-grid">
                <span>{t('history.serverSeed')}</span><code>{opening.proof.server_seed}</code>
                <span>{t('history.clientSeed')}</span><code>{opening.proof.client_seed}</code>
                <span>{t('history.nonce')}</span><code>{opening.proof.nonce}</code>
                <span>{t('history.result')}</span><code>{opening.proof.result_float.toFixed(8)}</code>
              </div>
            </details>
          </div>
        </div>

        <div className="opening-right">
          <span className="opening-value">${retail.toFixed(2)}</span>
          <span className="opening-paid">{t('history.paid')} ${opening.amount_paid.toFixed(2)}</span>
          {opening.status === 'exchanged' && opening.exchange_amount && (
            <span style={{ fontSize: '0.78rem', color: 'var(--green)' }}>
              +${opening.exchange_amount.toFixed(2)} {t('history.credited')}
            </span>
          )}
        </div>
      </div>

      {showShip && (
        <div className="modal-overlay" onClick={() => setShowShip(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">📦 {t('prize.shippingAddress')}</h2>
            <p className="modal-subtitle">{t('history.shipCostNote')}</p>
            <form onSubmit={handleShip} className="ship-form">
              {Object.keys(EMPTY_ADDR).map(field => (
                <div key={field} className="ship-form-row">
                  <label>{t(`prize.fields.${field}`)}</label>
                  <input className="input" required
                    value={addr[field]}
                    onChange={e => setAddr(a => ({ ...a, [field]: e.target.value }))} />
                </div>
              ))}
              {shipErr && <div className="alert alert-error">{shipErr}</div>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowShip(false)}>
                  {t('prize.back')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? t('prize.submitting') : t('prize.confirmShipment', { cost: '5.00' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
