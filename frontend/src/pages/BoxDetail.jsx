import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/index'
import BoxOpenAnimation from '../components/BoxOpenAnimation'
import PrizeModal from '../components/PrizeModal'

const RARITY_COLORS = {
  common: '#6b7280', uncommon: '#22c55e',
  rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}

export default function BoxDetail() {
  const { id } = useParams()
  const { user, wallet, refreshWallet } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [box, setBox] = useState(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [animData, setAnimData] = useState(null)
  const [animDone, setAnimDone] = useState(false)
  const [currentOpening, setCurrentOpening] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/boxes/${id}`)
      .then(res => setBox(res.data))
      .catch(() => setError(t('boxDetail.notFound')))
      .finally(() => setLoading(false))
  }, [id])

  const handleOpen = async () => {
    if (!user) { navigate('/login'); return }
    if (opening || animData) return

    setError('')
    setOpening(true)
    try {
      const res = await api.post(`/boxes/${id}/open`)
      const data = res.data
      setAnimData({ items: box.items, winnerId: data.won.id, response: data })
      setAnimDone(false)
      refreshWallet()
    } catch (e) {
      setError(e.response?.data?.error || t('boxDetail.failedOpen'))
    } finally {
      setOpening(false)
    }
  }

  const handleAnimFinish = () => {
    setAnimDone(true)
    setTimeout(() => setCurrentOpening(animData.response), 800)
  }

  const handleModalClose = () => {
    setCurrentOpening(null)
    setAnimData(null)
    setAnimDone(false)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!box) return <div className="page"><div className="empty-state">{t('boxDetail.notFound')}</div></div>

  const balance = parseFloat(wallet?.balance || 0)
  const canAfford = balance >= box.price
  const totalWeight = (box.items || []).reduce((s, i) => s + i.weight, 0)

  const openBtnLabel = () => {
    if (opening) return t('boxDetail.rolling')
    if (!user) return t('boxDetail.loginToOpen')
    if (!canAfford) return `${t('boxDetail.openBox')} — necesitas $${(box.price - balance).toFixed(2)} más`
    return `${t('boxDetail.openBox')} — $${box.price.toFixed(2)}`
  }

  return (
    <div className="page">
      <div className="box-detail">

        {/* Left: info */}
        <div className="box-detail-info">
          <img src={box.image_url} alt={box.name} className="box-detail-img" />
          <h1 className="box-detail-name">{box.name}</h1>
          <p className="box-detail-desc muted">{box.description}</p>

          <div className="box-detail-stats">
            <div className="stat-block">
              <span className="stat-block-label">{t('boxDetail.price')}</span>
              <span className="stat-block-value price">${box.price.toFixed(2)}</span>
            </div>
            <div className="stat-block">
              <span className="stat-block-label">{t('boxDetail.rtp')}</span>
              <span className="stat-block-value rtp">{box.rtp_pct}%</span>
            </div>
            <div className="stat-block">
              <span className="stat-block-label">{t('boxDetail.ev')}</span>
              <span className="stat-block-value">${box.expected_value.toFixed(2)}</span>
            </div>
            <div className="stat-block">
              <span className="stat-block-label">{t('boxDetail.openings')}</span>
              <span className="stat-block-value">{box.total_openings.toLocaleString()}</span>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {!animData && (
            <button
              className="btn btn-primary btn-open"
              onClick={handleOpen}
              disabled={opening || !canAfford}
            >
              {openBtnLabel()}
            </button>
          )}

          {user && !canAfford && (
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/wallet')}>
              {t('boxDetail.topUpWallet')}
            </button>
          )}
        </div>

        {/* Right: reel + items list */}
        <div className="box-detail-right">
          {animData ? (
            <BoxOpenAnimation
              items={animData.items}
              winnerId={animData.winnerId}
              onFinish={handleAnimFinish}
            />
          ) : (
            <div className="items-list">
              <h3 className="items-list-title">{t('boxDetail.possibleItems')}</h3>
              <div className="items-table">
                {[...(box.items || [])].sort((a, b) => b.product.retail_value - a.product.retail_value)
                  .map(item => (
                    <div key={item.id} className="item-row">
                      <img src={item.product.image_url} alt={item.product.name} className="item-row-img" />
                      <div className="item-row-info">
                        <span className="item-row-name">{item.product.name}</span>
                        <span
                          className="item-row-rarity"
                          style={{ color: RARITY_COLORS[item.product.rarity] }}
                        >
                          {t(`rarity.${item.product.rarity}`)}
                        </span>
                      </div>
                      <div className="item-row-right">
                        <span className="item-row-value">${item.product.retail_value.toFixed(2)}</span>
                        <span className="item-row-prob">
                          {totalWeight > 0 ? (item.weight / totalWeight * 100).toFixed(2) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {currentOpening && (
        <PrizeModal opening={currentOpening} onClose={handleModalClose} />
      )}
    </div>
  )
}
