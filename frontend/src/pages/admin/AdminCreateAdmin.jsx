import { useState } from 'react'
import { api } from '../../api/client'
import { CLIENT_IDS, themes } from '../../themes/index'

const EMPTY = { username: '', email: '', password: '', provider_client_id: 'xiaomi' }

export default function AdminCreateAdmin() {
  const [form, setForm]   = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [err, setErr]     = useState('')
  const [ok, setOk]       = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setErr(''); setOk('')
    try {
      const res = await api.post('/admin/admins', form)
      setOk(`Admin creado: ${res.data.username} (${res.data.provider_client_id})`)
      setForm(EMPTY)
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al crear admin')
    } finally { setLoading(false) }
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Crear Admin de Proveedor</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Este admin podrá gestionar productos y cajas del proveedor asignado.
      </p>

      {err && <p className="error-msg">{err}</p>}
      {ok  && <p className="success-msg">{ok}</p>}

      <form className="admin-form" style={{ maxWidth: '480px' }} onSubmit={handleSubmit}>
        <input className="input" placeholder="Nombre de usuario" value={form.username}
          onChange={e => set('username', e.target.value)} required />
        <input className="input" placeholder="Email" type="email" value={form.email}
          onChange={e => set('email', e.target.value)} required />
        <input className="input" placeholder="Contraseña (mín. 8 caracteres)" type="password"
          value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />

        <label className="admin-label">Proveedor asignado</label>
        <select className="input" value={form.provider_client_id}
          onChange={e => set('provider_client_id', e.target.value)}>
          {CLIENT_IDS.filter(id => id !== 'default').map(id => (
            <option key={id} value={id}>
              {themes[id].brandIcon} {themes[id].brandName}
            </option>
          ))}
        </select>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Creando…' : 'Crear Admin'}
        </button>
      </form>
    </div>
  )
}
