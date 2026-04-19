import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/index'
import BoxOpenScene from '../components/BoxOpenScene'
import PrizeModal from '../components/PrizeModal'

export default function BoxDetail() {
  const { id } = useParams()
  const { user, wallet, refreshWallet } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [box, setBox]                     = useState(null)
  const [loading, setLoading]             = useState(true)
  const [opening, setOpening]             = useState(false)   // API in-flight
  const [animData, setAnimData]           = useState(null)    // drives BoxOpenScene
  const [currentOpening, setCurrentOpening] = useState(null) // drives PrizeModal
  const [error, setError]                 = useState('')

  useEffect(() => {
    api.get(`/boxes/${id}`)
      .then(res => setBox(res.data))
      .catch(() => setError(t('boxDetail.notFound')))
      .finally(() => setLoading(false))
  }, [id])   // eslint-disable-line react-hooks/exhaustive-deps

  /* Open box ─────────────────────────────────────────────── */
  const handleOpen = async () => {
    if (!user)          { navigate('/login'); return }
    if (opening || animData) return

    setError('')
    setOpening(true)
    try {
      const res  = await api.post(`/boxes/${id}/open`)
      const data = res.data
      setAnimData({ items: box.items, winnerId: data.won.id, response: data })
      refreshWallet()
    } catch (e) {
      setError(e.response?.data?.error || t('boxDetail.failedOpen'))
    } finally {
      setOpening(false)
    }
  }

  /* BoxOpenScene calls this when the REVEALING phase ends ─── */
  const handleAnimFinish = () => {
    // Small extra delay for dramatic pause before the modal
    setTimeout(() => setCurrentOpening(animData.response), 200)
  }

  const handleModalClose = () => {
    setCurrentOpening(null)
    setAnimData(null)
  }

  /* Guards ──────────────────────────────────────────────────── */
  if (loading)
    return <div className="loading-screen"><div className="spinner" /></div>
  if (!box)
    return <div className="page"><div className="empty-state">{t('boxDetail.notFound')}</div></div>

  const balance   = parseFloat(wallet?.balance || 0)
  const canAfford = balance >= box.price

  const openBtnLabel = () => {
    if (opening)   return t('boxDetail.rolling')
    if (!user)     return t('boxDetail.loginToOpen')
    if (!canAfford) return t('boxDetail.needMore', { amount: (box.price - balance).toFixed(2) })
    return `${t('boxDetail.openBox')} — $${box.price.toFixed(2)}`
  }

  return (
    <div className="page">
      <div className="box-detail">

        {/* ── Left: info + stats + CTA ─────────────────────── */}
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

          {/* Show CTA only while not animating */}
          {!animData && (
            <button
              className="btn btn-primary btn-open"
              onClick={handleOpen}
              disabled={opening || !canAfford}
            >
              {openBtnLabel()}
            </button>
          )}

          {user && !canAfford && !animData && (
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: '0.5rem' }}
              onClick={() => navigate('/wallet')}
            >
              {t('boxDetail.topUpWallet')}
            </button>
          )}
        </div>

        {/* ── Right: BoxOpenScene (idle items grid → animation) */}
        <div className="box-detail-right">
          <BoxOpenScene
            box={box}
            animData={animData}
            onFinish={handleAnimFinish}
          />
        </div>
      </div>

      {/* Prize modal — shown after animation completes ──────── */}
      {currentOpening && (
        <PrizeModal opening={currentOpening} onClose={handleModalClose} />
      )}
    </div>
  )
}
