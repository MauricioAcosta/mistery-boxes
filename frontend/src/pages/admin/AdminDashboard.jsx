import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const isSuperAdmin = ['super_admin', 'admin'].includes(user?.role)

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-loading"><div className="spinner" /></div>

  const revenue      = stats?.total_revenue     ?? 0
  const profit       = stats?.gross_profit      ?? 0
  const actualMargin = stats?.actual_margin_pct ?? 0
  const targetMargin = stats?.target_margin_pct ?? 30
  const marginDiff   = actualMargin - targetMargin
  const marginOk     = marginDiff >= -1   // within 1 % is fine

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Dashboard</h1>

      {/* ── Main stats ──────────────────────────────────────── */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-icon">👤</span>
          <span className="admin-stat-value">{stats?.total_users ?? '–'}</span>
          <span className="admin-stat-label">Usuarios</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon">🎁</span>
          <span className="admin-stat-value">{stats?.total_openings ?? '–'}</span>
          <span className="admin-stat-label">Aperturas</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon">💵</span>
          <span className="admin-stat-value">
            ${revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="admin-stat-label">Ingresos</span>
        </div>
        <div className="admin-stat-card accent">
          <span className="admin-stat-icon">📈</span>
          <span className="admin-stat-value">
            ${profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="admin-stat-label">Ganancia bruta</span>
        </div>
      </div>

      {/* ── Margin health (super_admin only) ────────────────── */}
      {isSuperAdmin && (
        <div className="dash-margin-panel">
          <div className="dash-margin-header">
            <h3>Salud del Margen</h3>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/admin/config')}
            >
              ⚙️ Configurar
            </button>
          </div>

          <div className="dash-margin-bars">
            {/* Actual margin bar */}
            <div className="dash-mbar-row">
              <span className="dash-mbar-label">Margen real</span>
              <div className="dash-mbar-track">
                <div
                  className={`dash-mbar-fill ${marginOk ? 'fill-ok' : 'fill-warn'}`}
                  style={{ width: `${Math.min(actualMargin, 100)}%` }}
                />
              </div>
              <span className={`dash-mbar-pct ${marginOk ? 'pct-ok' : 'pct-warn'}`}>
                {actualMargin.toFixed(1)} %
              </span>
            </div>

            {/* Target margin bar */}
            <div className="dash-mbar-row">
              <span className="dash-mbar-label">Objetivo</span>
              <div className="dash-mbar-track">
                <div
                  className="dash-mbar-fill fill-target"
                  style={{ width: `${Math.min(targetMargin, 100)}%` }}
                />
              </div>
              <span className="dash-mbar-pct pct-target">
                {targetMargin.toFixed(1)} %
              </span>
            </div>
          </div>

          {stats?.total_openings > 0 && (
            <p className={`dash-margin-status ${marginOk ? 'status-ok' : 'status-warn'}`}>
              {marginOk
                ? `Margen dentro del objetivo (+${marginDiff.toFixed(1)} %)`
                : `Margen por debajo del objetivo (${marginDiff.toFixed(1)} %)  — revisa la configuración`}
            </p>
          )}

          {stats?.total_openings === 0 && (
            <p className="muted dash-margin-status">Sin aperturas aún — el margen se calculará cuando haya actividad.</p>
          )}

          {/* Revenue split visualization */}
          {revenue > 0 && (
            <div className="dash-split-wrap">
              <div className="dash-split-bar">
                <div
                  className="dash-split-prizes"
                  style={{ width: `${Math.min((revenue - profit) / revenue * 100, 100)}%` }}
                >
                  <span>Premios ${(revenue - profit).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div
                  className="dash-split-profit"
                  style={{ width: `${Math.min(profit / revenue * 100, 100)}%` }}
                >
                  <span>Ganancia ${profit.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
