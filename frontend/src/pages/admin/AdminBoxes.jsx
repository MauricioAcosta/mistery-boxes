import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

export default function AdminBoxes() {
  const [boxes, setBoxes]   = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api.get('/admin/boxes').then(r => setBoxes(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const toggle = async box => {
    await api.patch(`/admin/boxes/${box.id}/toggle`)
    load()
  }

  if (loading) return <div className="admin-loading"><div className="spinner" /></div>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Cajas ({boxes.length})</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/boxes/new')}>
          + Crear Caja
        </button>
      </div>

      <div className="admin-boxes-grid">
        {boxes.map(box => (
          <div key={box.id} className={`admin-box-card ${!box.is_active ? 'inactive' : ''}`}>
            <img src={box.image_url} alt={box.name} className="admin-box-img" />
            <div className="admin-box-info">
              <span className="admin-box-name">{box.name}</span>
              <span className="admin-box-meta">${box.price.toFixed(2)} · {box.client_id} · {box.items?.length ?? 0} items</span>
              {box.price_coins && <span className="admin-box-coins">🪙 {box.price_coins} coins</span>}
              <span className="admin-box-openings">{box.total_openings} aperturas</span>
            </div>
            <div className="admin-box-actions">
              <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/admin/boxes/${box.id}/edit`)}>
                ✏️ Editar
              </button>
              <button
                className={`btn btn-xs ${box.is_active ? 'btn-outline' : 'btn-primary'}`}
                onClick={() => toggle(box)}
              >
                {box.is_active ? '⛔ Desactivar' : '✅ Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
