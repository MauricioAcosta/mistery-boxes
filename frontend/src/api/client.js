import axios from 'axios'

// En desarrollo: VITE_API_BASE_URL no está definida → usa ruta relativa '/api'
// En producción (Vercel): VITE_API_BASE_URL = 'https://mistery-boxes-backend.fly.dev'
const BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api'

export const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
