import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { user, wallet, logout } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Cierra el menú al cambiar de ruta
  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  // Bloquea scroll cuando el menú mobile está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleLogout = () => { logout(); navigate('/') }

  const navLinks = [
    { to: '/',        label: 'Cajas' },
    { to: '/verify',  label: 'Verificar' },
    ...(user ? [{ to: '/history', label: 'Historial' }] : []),
    ...(user && ['super_admin', 'admin_provider', 'admin'].includes(user.role)
      ? [{ to: '/admin', label: '⚙️ Admin' }] : []),
  ]

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <img src="/logo.png" className="brand-logo" alt="MysteryBoxes" />
          </Link>

          {/* Desktop links */}
          <div className="navbar-links">
            {navLinks.map(l => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
                end={l.to === '/'}>
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="navbar-actions">
            {user ? (
              <>
                <Link to="/wallet" className="wallet-badge">
                  <span className="wallet-icon">💰</span>
                  <span className="wallet-balance">${parseFloat(wallet?.balance || 0).toFixed(2)}</span>
                  {(wallet?.coins || 0) > 0 && (
                    <span className="wallet-coins">🪙 {wallet.coins.toLocaleString()}</span>
                  )}
                </Link>
                <span className="nav-username">{user.username}</span>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Salir</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Ingresar</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Registrarse</Link>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            className={`nav-hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menú"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="nav-mobile-overlay" onClick={() => setMenuOpen(false)}>
          <div className="nav-mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="nav-mobile-header">
              <img src="/logo.png" className="brand-logo" alt="MysteryBoxes" />
              <button className="nav-mobile-close" onClick={() => setMenuOpen(false)}>✕</button>
            </div>

            {user && (
              <div className="nav-mobile-user">
                <span>👤 {user.username}</span>
                <Link to="/wallet" className="wallet-badge" onClick={() => setMenuOpen(false)}>
                  💰 ${parseFloat(wallet?.balance || 0).toFixed(2)}
                </Link>
              </div>
            )}

            <nav className="nav-mobile-links">
              {navLinks.map(l => (
                <NavLink key={l.to} to={l.to} className="nav-mobile-link"
                  end={l.to === '/'} onClick={() => setMenuOpen(false)}>
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="nav-mobile-footer">
              {user ? (
                <button className="btn btn-outline" style={{ width: '100%' }} onClick={handleLogout}>
                  Cerrar sesión
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <Link to="/login" className="btn btn-ghost" style={{ textAlign: 'center' }}
                    onClick={() => setMenuOpen(false)}>Ingresar</Link>
                  <Link to="/register" className="btn btn-primary" style={{ textAlign: 'center' }}
                    onClick={() => setMenuOpen(false)}>Registrarse</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
