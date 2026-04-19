import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const EMPTY = { name: '', brand: '', category: 'tech', retail_value: '', rarity: 'common', image_url: '', description: '' }

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [form, setForm]         = useState(EMPTY)
  const [editing, setEditing]   = useState(null)   // product id being edited
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')
  const [ok, setOk]             = useState('')

  const load = () => api.get('/admin/products').then(r => setProducts(r.data))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setErr(''); setOk('')
    try {
      if (editing) {
        await api.patch(`/admin/products/${editing}`, form)
        setOk('Producto actualizado.')
      } else {
        await api.post('/admin/products', form)
        setOk('Producto creado.')
      }
      setForm(EMPTY); setEditing(null)
      load()
    } catch (e) {
      setErr(e.response?.data?.error || 'Error')
    } finally { setLoading(false) }
  }

  const startEdit = p => {
    setEditing(p.id)
    setForm({ name: p.name, brand: p.brand, category: p.category,
              retail_value: p.retail_value, rarity: p.rarity,
              image_url: p.image_url, description: p.description || '' })
  }

  const toggleActive = async p => {
    await api.patch(`/admin/products/${p.id}`, { is_active: !p.is_active })
    load()
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">{editing ? 'Editar Producto' : 'Crear Producto'}</h1>

      {err && <p className="error-msg">{err}</p>}
      {ok  && <p className="success-msg">{ok}</p>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-row">
          <input className="input" placeholder="Nombre" value={form.name} onChange={e => set('name', e.target.value)} required />
          <input className="input" placeholder="Marca" value={form.brand} onChange={e => set('brand', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <input className="input" placeholder="Valor retail (USD)" type="number" step="0.01" value={form.retail_value} onChange={e => set('retail_value', e.target.value)} required />
          <input className="input" placeholder="Categoría" value={form.category} onChange={e => set('category', e.target.value)} />
          <select className="input" value={form.rarity} onChange={e => set('rarity', e.target.value)}>
            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <input className="input" placeholder="URL de imagen" value={form.image_url} onChange={e => set('image_url', e.target.value)} />
        <textarea className="input" placeholder="Descripción" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
        <div className="admin-form-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Guardando…' : (editing ? 'Actualizar' : 'Crear Producto')}
          </button>
          {editing && <button className="btn btn-ghost" type="button" onClick={() => { setEditing(null); setForm(EMPTY) }}>Cancelar</button>}
        </div>
      </form>

      <h2 className="admin-section-title" style={{ marginTop: '2rem' }}>Productos existentes ({products.length})</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Imagen</th><th>Nombre</th><th>Marca</th><th>Rareza</th><th>Valor</th><th>Cliente</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className={p.is_active === false ? 'row-inactive' : ''}>
                <td><img src={p.image_url} alt={p.name} className="admin-table-img" /></td>
                <td>{p.name}</td>
                <td>{p.brand}</td>
                <td><span className={`rarity-tag rarity-${p.rarity}`}>{p.rarity}</span></td>
                <td>${p.retail_value.toFixed(2)}</td>
                <td>{p.client_id}</td>
                <td>{p.is_active !== false ? '✅' : '⛔'}</td>
                <td>
                  <button className="btn btn-ghost btn-xs" onClick={() => startEdit(p)}>Editar</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => toggleActive(p)}>
                    {p.is_active !== false ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
