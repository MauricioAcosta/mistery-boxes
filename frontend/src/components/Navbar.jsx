import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/index'
import { useTheme } from '../context/ThemeContext'
import { CLIENT_IDS, themes } from '../themes/index'

const IS_DEV = import.meta.env.DEV

export default function Navbar() {
  const { user, wallet, logout } = useAuth()
  const { t, lang, setLang } = useI18n()
  const { theme, clientId, setClient } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleLang = () => setLang(lang === 'es' ? 'en' : 'es')

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">{theme.brandIcon}</span>
          <span className="brand-name">{theme.brandName}</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">{t('nav.boxes')}</Link>
          <Link to="/verify" className="nav-link">{t('nav.verify')}</Link>
          {user && <Link to="/history" className="nav-link">{t('nav.history')}</Link>}
          {user && ['super_admin', 'admin_provider', 'admin'].includes(user.role) && (
            <Link to="/admin" className="nav-link nav-link-admin">⚙️ Admin</Link>
          )}
        </div>

        <div className="navbar-actions">
          {/* Language toggle */}
          <button
            className="btn btn-ghost btn-sm lang-toggle"
            onClick={toggleLang}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            {lang === 'es' ? '🇬🇧 EN' : '🇨🇴 ES'}
          </button>

          {/* Client / theme switcher — visible in dev mode or when VITE_SHOW_THEME_SWITCHER=true */}
          {(IS_DEV || import.meta.env.VITE_SHOW_THEME_SWITCHER === 'true') && (
            <select
              className="theme-select"
              value={clientId}
              onChange={e => setClient(e.target.value)}
              title="Cambiar cliente / tema"
            >
              {CLIENT_IDS.map(id => (
                <option key={id} value={id}>
                  {themes[id].brandIcon} {themes[id].brandName}
                </option>
              ))}
            </select>
          )}

          {user ? (
            <>
              <Link to="/wallet" className="wallet-badge">
                <span className="wallet-icon">💰</span>
                <span className="wallet-balance">${parseFloat(wallet?.balance || 0).toFixed(2)}</span>
                {(wallet?.coins || 0) > 0 && (
                  <span className="wallet-coins">🪙 {(wallet.coins).toLocaleString()}</span>
                )}
              </Link>
              <span className="nav-username">{user.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">{t('nav.login')}</Link>
              <Link to="/register" className="btn btn-primary btn-sm">{t('nav.signup')}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
