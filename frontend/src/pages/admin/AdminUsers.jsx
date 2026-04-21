import { useState, useEffect } from 'react'
import { api } from '../../api/client'

export default function AdminUsers() {
  const [data, setData]     = useState({ users: [], total: 0, pages: 1 })
  const [page, setPage]     = useState(1)
  const [q, setQ]           = useState('')
  const [loading, setLoading] = useState(true)

  const load = (p = page, search = q) => {
    setLoading(true)
    api.get('/admin/users', { params: { page: p, q: search } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])  // eslint-disable-line

  const handleSearch = e => {
    e.preventDefault()
    setPage(1)
    load(1, q)
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Usuarios ({data.total})</h1>

      <form className="admin-search-form" onSubmit={handleSearch}>
        <input className="input" placeholder="Buscar por nombre o email…"
          value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn btn-outline" type="submit">Buscar</button>
      </form>

      {loading ? <div className="admin-loading"><div className="spinner" /></div> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>#</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Proveedor</th><th>Registro</th></tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                    <td>{u.provider_client_id || '—'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
            <span>Pág {page} / {data.pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
          </div>
        </>
      )}
    </div>
  )
}
