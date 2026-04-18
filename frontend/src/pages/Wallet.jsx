import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/index'

const TX_ICONS = {
  deposit: '💳', box_open: '🎁', exchange: '💰', withdraw: '📤', credit: '⬆️', debit: '⬇️',
}

export default function Wallet() {
  const { wallet, refreshWallet } = useAuth()
  const { t } = useI18n()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/wallet')
      .then(res => setTransactions(res.data.transactions))
      .finally(() => setLoading(false))
  }, [])

  const handleDeposit = async e => {
    e.preventDefault()
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) { setError(t('wallet.invalidAmount')); return }
    setDepositing(true)
    setError('')
    setMessage('')
    try {
      await api.post('/wallet/deposit', { amount })
      await refreshWallet()
      const res = await api.get('/wallet')
      setTransactions(res.data.transactions)
      setMessage(`$${amount.toFixed(2)} ${t('wallet.deposit') === 'Deposit' ? 'added successfully!' : 'añadido exitosamente!'}`)
      setDepositAmount('')
    } catch (e) {
      setError(e.response?.data?.error || t('wallet.depositFailed'))
    } finally {
      setDepositing(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">{t('wallet.title')}</h1>

      <div className="wallet-page">
        {/* Balance card */}
        <div className="balance-card">
          <div className="balance-label">{t('wallet.availableBalance')}</div>
          <div className="balance-amount">${parseFloat(wallet?.balance || 0).toFixed(2)}</div>
          <div className="balance-sub">USD</div>
        </div>

        {/* Deposit */}
        <div className="card">
          <h3>{t('wallet.topUp')}</h3>
          <p className="muted small">{t('wallet.simulated')}</p>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <form className="deposit-form" onSubmit={handleDeposit}>
            <div className="deposit-presets">
              {[10, 25, 50, 100].map(v => (
                <button
                  key={v}
                  type="button"
                  className={`preset-btn ${depositAmount == v ? 'active' : ''}`}
                  onClick={() => setDepositAmount(String(v))}
                >
                  ${v}
                </button>
              ))}
            </div>
            <div className="deposit-input-row">
              <span className="deposit-dollar">$</span>
              <input
                className="input deposit-input"
                type="number"
                min="1"
                max="1000"
                step="0.01"
                placeholder="0.00"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
              />
              <button className="btn btn-primary" type="submit" disabled={depositing}>
                {depositing ? t('wallet.depositing') : t('wallet.deposit')}
              </button>
            </div>
          </form>
        </div>

        {/* Transactions */}
        <div className="card">
          <h3>{t('wallet.transactionHistory')}</h3>
          {loading ? (
            <div className="spinner" />
          ) : transactions.length === 0 ? (
            <p className="muted">{t('wallet.noTransactions')}</p>
          ) : (
            <div className="tx-list">
              {transactions.map(tx => (
                <div key={tx.id} className={`tx-row ${tx.amount >= 0 ? 'tx-positive' : 'tx-negative'}`}>
                  <span className="tx-icon">{TX_ICONS[tx.type] || '•'}</span>
                  <div className="tx-info">
                    <span className="tx-desc">{tx.description}</span>
                    <span className="tx-date muted">{new Date(tx.created_at).toLocaleString()}</span>
                  </div>
                  <span className={`tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                    {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
