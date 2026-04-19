/**
 * Admin panel — layout with sidebar + nested routes.
 * Roles:
 *   super_admin   → all sections + user management + create provider admins
 *   admin_provider → scoped to their client_id: products, boxes, stats
 */
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminDashboard  from './admin/AdminDashboard'
import AdminProducts   from './admin/AdminProducts'
import AdminBoxBuilder from './admin/AdminBoxBuilder'
import AdminBoxes      from './admin/AdminBoxes'
import AdminUsers      from './admin/AdminUsers'
import AdminCreateAdmin from './admin/AdminCreateAdmin'
import AdminConfig     from './admin/AdminConfig'

export default function Admin() {
  const { user } = useAuth()
  const isSuperAdmin = ['super_admin', 'admin'].includes(user?.role)
  const navigate = useNavigate()

  const navItem = (to, label, icon) => (
    <NavLink
      to={to}
      className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="admin-nav-icon">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-title">⚙️ Panel Admin</span>
          <span className="admin-role-badge">
            {isSuperAdmin ? 'Super Admin' : `Admin · ${user?.provider_client_id}`}
          </span>
        </div>
        <nav className="admin-nav">
          {navItem('/admin', 'Dashboard', '📊')}
          {navItem('/admin/products', 'Productos', '📦')}
          {navItem('/admin/boxes', 'Cajas', '🎁')}
          {navItem('/admin/boxes/new', 'Crear Caja', '➕')}
          {isSuperAdmin && navItem('/admin/users', 'Usuarios', '👥')}
          {isSuperAdmin && navItem('/admin/admins/new', 'Crear Admin', '🔑')}
          {isSuperAdmin && navItem('/admin/config', 'Configuración', '⚙️')}
        </nav>
        <button
          className="btn btn-ghost btn-sm admin-back-btn"
          onClick={() => navigate('/')}
        >
          ← Volver al sitio
        </button>
      </aside>

      {/* Content area */}
      <div className="admin-content">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="boxes" element={<AdminBoxes />} />
          <Route path="boxes/new" element={<AdminBoxBuilder />} />
          <Route path="boxes/:boxId/edit" element={<AdminBoxBuilder />} />
          {isSuperAdmin && <Route path="users" element={<AdminUsers />} />}
          {isSuperAdmin && <Route path="admins/new" element={<AdminCreateAdmin />} />}
          {isSuperAdmin && <Route path="config" element={<AdminConfig />} />}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  )
}
