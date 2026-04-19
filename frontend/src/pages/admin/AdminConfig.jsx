/**
 * AdminConfig — Platform profit / house-edge configuration.
 * Only visible to super_admin.
 *
 * Controls:
 *   house_edge_pct   (1–70 %)  — target platform margin
 *   margin_strength  (0–1)     — how aggressively the engine enforces it
 */
import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const PCT_MIN = 1
const PCT_MAX = 70

const PRESETS = [
  { label: 'Conservador 20 %',  pct: 20, strength: 0.8 },
  { label: 'Estándar 30 %',     pct: 30, strength: 1.0 },
  { label: 'Agresivo 40 %',     pct: 40, strength: 1.0 },
  { label: 'Máximo 50 %',       pct: 50, strength: 1.0 },
]

export default function AdminConfig() {
  const [cfg, setCfg]       = useState({ house_edge_pct: 30, margin_strength: 1.0 })
  const [stats, setStats]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')
  const [ok, setOk]             = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/admin/config'),
      api.get('/admin/stats'),
    ]).then(([cfgRes, statsRes]) => {
      setCfg(cfgRes.data)
      setStats(statsRes.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true); setErr(''); setOk('')
    try {
      await api.patch('/admin/config', cfg)
      setOk('Configuración guardada correctamente.')
      load()
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const applyPreset = p => setCfg({ house_edge_pct: p.pct, margin_strength: p.strength })

  const targetRtp      = 100 - cfg.house_edge_pct
  const actualMargin   = stats?.actual_margin_pct ?? null
  const revenue        = stats?.total_revenue ?? 0
  const profit         = stats?.gross_profit  ?? 0
  const marginDelta    = actualMargin !== null ? (actualMargin - cfg.house_edge_pct).toFixed(1) : null

  if (loading) return <div className="admin-loading"><div className="spinner" /></div>

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Configuración de Ganancia</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Ajusta el porcentaje de ganancia de la plataforma. El algoritmo ajusta
        automáticamente las probabilidades para asegurar el margen objetivo.
      </p>

      {err && <p className="error-msg">{err}</p>}
      {ok  && <p className="success-msg">{ok}</p>}

      {/* ── Live metrics ──────────────────────────────────────── */}
      <div className="config-metrics-grid">
        <div className="config-metric-card">
          <span className="config-metric-icon">💵</span>
          <span className="config-metric-value">${revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span className="config-metric-label">Ingresos totales</span>
        </div>
        <div className="config-metric-card">
          <span className="config-metric-icon">📈</span>
          <span className="config-metric-value">${profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span className="config-metric-label">Ganancia bruta</span>
        </div>
        <div className={`config-metric-card ${actualMargin !== null ? (actualMargin >= cfg.house_edge_pct ? 'metric-ok' : 'metric-warn') : ''}`}>
          <span className="config-metric-icon">🎯</span>
          <span className="config-metric-value">
            {actualMargin !== null ? `${actualMargin.toFixed(1)} %` : '—'}
            {marginDelta !== null && (
              <span className={`config-metric-delta ${parseFloat(marginDelta) >= 0 ? 'delta-pos' : 'delta-neg'}`}>
                {parseFloat(marginDelta) >= 0 ? '+' : ''}{marginDelta} %
              </span>
            )}
          </span>
          <span className="config-metric-label">Margen real vs objetivo</span>
        </div>
        <div className="config-metric-card accent">
          <span className="config-metric-icon">⚙️</span>
          <span className="config-metric-value">{cfg.house_edge_pct} %</span>
          <span className="config-metric-label">Objetivo actual</span>
        </div>
      </div>

      {/* ── Presets ───────────────────────────────────────────── */}
      <div className="config-section">
        <h3 className="config-section-title">Presets rápidos</h3>
        <div className="config-presets">
          {PRESETS.map(p => (
            <button
              key={p.label}
              className={`btn config-preset-btn ${cfg.house_edge_pct === p.pct ? 'btn-primary' : 'btn-outline'}`}
              type="button"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────────────── */}
      <form className="admin-form config-form" onSubmit={handleSave}>
        <div className="config-section">
          <h3 className="config-section-title">Margen objetivo de ganancia</h3>

          <div className="config-slider-row">
            <div className="config-slider-labels">
              <span>Jugadores reciben</span>
              <strong className="config-rtp-value">{targetRtp} %</strong>
            </div>
            <input
              type="range"
              className="config-slider"
              min={PCT_MIN} max={PCT_MAX} step="0.5"
              value={cfg.house_edge_pct}
              onChange={e => setCfg(p => ({ ...p, house_edge_pct: parseFloat(e.target.value) }))}
            />
            <div className="config-slider-labels">
              <span>Plataforma retiene</span>
              <strong className="config-edge-value" style={{ color: 'var(--accent)' }}>
                {cfg.house_edge_pct} %
              </strong>
            </div>
          </div>

          <div className="config-split-bar">
            <div
              className="config-split-rtp"
              style={{ width: `${targetRtp}%` }}
            >
              RTP {targetRtp} %
            </div>
            <div
              className="config-split-edge"
              style={{ width: `${cfg.house_edge_pct}%` }}
            >
              {cfg.house_edge_pct} %
            </div>
          </div>

          <div className="config-example">
            <span className="muted">Ejemplo:</span>
            {' '}Si ingresan <strong>$1,000,000 USD</strong>, la plataforma
            retiene <strong>${(1000000 * cfg.house_edge_pct / 100).toLocaleString()} USD</strong> y
            entrega en premios <strong>${(1000000 * targetRtp / 100).toLocaleString()} USD</strong>.
          </div>
        </div>

        <div className="config-section">
          <h3 className="config-section-title">
            Fuerza de aplicación
            <span className="config-strength-badge">
              {cfg.margin_strength === 0 ? 'Desactivado' :
               cfg.margin_strength < 0.5 ? 'Suave' :
               cfg.margin_strength < 1.0 ? 'Moderado' : 'Máximo'}
            </span>
          </h3>
          <p className="muted config-hint">
            Controla qué tan agresivamente el algoritmo ajusta las probabilidades.
            A 0 solo se usan los pesos del administrador del proveedor.
            A 1 el motor garantiza el margen objetivo en cada apertura.
          </p>

          <div className="config-slider-row">
            <span className="config-strength-label">Apagado</span>
            <input
              type="range"
              className="config-slider"
              min="0" max="1" step="0.05"
              value={cfg.margin_strength}
              onChange={e => setCfg(p => ({ ...p, margin_strength: parseFloat(e.target.value) }))}
            />
            <span className="config-strength-label">Máximo</span>
          </div>
          <div className="config-strength-value">{Math.round(cfg.margin_strength * 100)} %</div>
        </div>

        <div className="admin-form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Aplicar configuración'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={load}>
            Cancelar
          </button>
        </div>
      </form>

      {/* ── Info box ──────────────────────────────────────────── */}
      <div className="config-info-box">
        <h4>¿Cómo funciona el algoritmo?</h4>
        <ol>
          <li>Cada proveedor define pesos para sus productos (ej: Legendary = 1, Common = 80).</li>
          <li>El motor calcula el <em>Valor Esperado (EV)</em> actual de la caja.</li>
          <li>Si el EV supera el objetivo (<code>precio × {targetRtp / 100}</code>), el motor
              reduce automáticamente la probabilidad de los ítems de mayor valor para alcanzar el margen.</li>
          <li>La "Fuerza de aplicación" controla cuánto se aleja el motor de los pesos originales.</li>
          <li>El sistema es <em>Provably Fair</em>: el seed determina el resultado; el margen
              opera sobre la distribución de probabilidades, no sobre resultados individuales.</li>
        </ol>
      </div>
    </div>
  )
}
