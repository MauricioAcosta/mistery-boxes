/**
 * AdminBoxBuilder — Create or edit a box.
 * Allows selecting products, assigning weights (probability), and setting prices.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'

const EMPTY_BOX = {
  name: '', description: '', price: '', price_coins: '',
  image_url: '', category: 'tech',
}

export default function AdminBoxBuilder() {
  const { boxId } = useParams()
  const navigate  = useNavigate()
  const isEdit    = Boolean(boxId)

  const [form, setForm]           = useState(EMPTY_BOX)
  const [allProducts, setAllProducts] = useState([])
  const [items, setItems]         = useState([])   // [{ product, weight }]
  const [loading, setLoading]     = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [err, setErr]             = useState('')

  // Load available products
  useEffect(() => {
    api.get('/admin/products').then(r => setAllProducts(r.data))
  }, [])

  // Load existing box if editing
  useEffect(() => {
    if (!isEdit) return
    api.get('/admin/boxes').then(r => {
      const box = r.data.find(b => String(b.id) === boxId)
      if (!box) return
      setForm({
        name: box.name, description: box.description || '',
        price: box.price, price_coins: box.price_coins || '',
        image_url: box.image_url || '', category: box.category || 'tech',
      })
      setItems((box.items || []).map(it => ({ product: it.product, weight: it.weight })))
    }).finally(() => setLoadingData(false))
  }, [boxId, isEdit])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Add product to box
  const addProduct = productId => {
    const p = allProducts.find(p => String(p.id) === String(productId))
    if (!p || items.find(it => it.product.id === p.id)) return
    setItems(prev => [...prev, { product: p, weight: 10 }])
  }

  const setWeight = (productId, weight) => {
    setItems(prev => prev.map(it =>
      it.product.id === productId ? { ...it, weight: parseInt(weight) || 1 } : it
    ))
  }

  const removeItem = productId => setItems(prev => prev.filter(it => it.product.id !== productId))

  // Computed probabilities
  const totalWeight = items.reduce((s, it) => s + it.weight, 0)
  const prob = it => totalWeight > 0 ? ((it.weight / totalWeight) * 100).toFixed(1) : '0.0'

  const handleSubmit = async e => {
    e.preventDefault()
    if (items.length === 0) { setErr('Agrega al menos un producto.'); return }
    setLoading(true); setErr('')
    const payload = {
      ...form,
      price: parseFloat(form.price),
      price_coins: form.price_coins ? parseInt(form.price_coins) : null,
      items: items.map(it => ({ product_id: it.product.id, weight: it.weight })),
    }
    try {
      if (isEdit) {
        await api.patch(`/admin/boxes/${boxId}`, payload)
      } else {
        await api.post('/admin/boxes', payload)
      }
      navigate('/admin/boxes')
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al guardar')
    } finally { setLoading(false) }
  }

  if (loadingData) return <div className="admin-loading"><div className="spinner" /></div>

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">{isEdit ? 'Editar Caja' : 'Crear Caja'}</h1>
      {err && <p className="error-msg">{err}</p>}

      <form className="admin-form" onSubmit={handleSubmit}>
        {/* Basic info */}
        <div className="admin-form-row">
          <input className="input" placeholder="Nombre de la caja" value={form.name}
            onChange={e => set('name', e.target.value)} required />
          <input className="input" placeholder="Categoría" value={form.category}
            onChange={e => set('category', e.target.value)} />
        </div>
        <textarea className="input" placeholder="Descripción" value={form.description}
          onChange={e => set('description', e.target.value)} rows={2} />
        <input className="input" placeholder="URL imagen de la caja" value={form.image_url}
          onChange={e => set('image_url', e.target.value)} />
        <div className="admin-form-row">
          <input className="input" placeholder="Precio USD" type="number" step="0.01"
            value={form.price} onChange={e => set('price', e.target.value)} required />
          <input className="input" placeholder="Precio en coins (opcional)" type="number"
            value={form.price_coins} onChange={e => set('price_coins', e.target.value)} />
        </div>

        {/* Add product */}
        <div className="admin-builder-section">
          <h3>Productos en la caja</h3>
          <select className="input" onChange={e => addProduct(e.target.value)} value="">
            <option value="">— Agregar producto —</option>
            {allProducts.filter(p => !items.find(it => it.product.id === p.id)).map(p => (
              <option key={p.id} value={p.id}>
                [{p.rarity}] {p.name} (${p.retail_value.toFixed(2)})
              </option>
            ))}
          </select>

          {items.length > 0 && (
            <div className="admin-builder-items">
              {items.map(it => (
                <div key={it.product.id} className="admin-builder-item">
                  <img src={it.product.image_url} alt={it.product.name} className="admin-builder-img" />
                  <div className="admin-builder-item-info">
                    <span className="admin-builder-name">{it.product.name}</span>
                    <span className="muted">${it.product.retail_value.toFixed(2)} · {it.product.rarity}</span>
                  </div>
                  <div className="admin-builder-weight">
                    <label>Peso</label>
                    <input type="number" min="1" className="input input-sm"
                      value={it.weight} onChange={e => setWeight(it.product.id, e.target.value)} />
                    <span className="admin-builder-prob">{prob(it)}%</span>
                  </div>
                  <button type="button" className="btn btn-ghost btn-xs"
                    onClick={() => removeItem(it.product.id)}>✕</button>
                </div>
              ))}
              <div className="admin-builder-ev">
                <span>Valor esperado (EV):&nbsp;
                  <strong>
                    ${items.reduce((s, it) => s + it.product.retail_value * it.weight, 0) / totalWeight > 0
                      ? (items.reduce((s, it) => s + it.product.retail_value * it.weight, 0) / totalWeight).toFixed(2)
                      : '0.00'}
                  </strong>
                </span>
                {form.price && (
                  <span className="muted">&nbsp;· RTP ≈ {
                    ((items.reduce((s, it) => s + it.product.retail_value * it.weight, 0) / totalWeight)
                      / parseFloat(form.price) * 100).toFixed(1)
                  }%</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="admin-form-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear Caja')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/boxes')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
