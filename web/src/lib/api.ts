// Sedap POS — API client (token otomatis + redirect saat sesi habis)
'use client'

import type { AuthUser, StoreInfo } from './types'

export const API_URL = '/api'
const AUTH_KEY = 'sedap_auth'

export interface AuthState {
  token: string
  user: AuthUser
  store?: StoreInfo
}

export function getAuth(): AuthState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as AuthState) : null
  } catch {
    return null
  }
}

export function setAuth(state: AuthState) {
  const prev = getAuth()
  // Pertahankan store yang sudah ada kalau respons login tidak menyertakannya
  const merged = state.store ? state : prev?.store ? { ...state, store: prev.store } : state
  localStorage.setItem(AUTH_KEY, JSON.stringify(merged))
}

const STORE_KEY = 'sedap_store'

// Cache identitas toko untuk halaman publik (login/landing) — sinkron dengan sedap_store yang dipakai provider
export function getStoreInfo(): StoreInfo | null {
  if (typeof window === 'undefined') return null
  try {
    const fromAuth = getAuth()?.store
    if (fromAuth) return fromAuth
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as StoreInfo) : null
  } catch {
    return null
  }
}

export function setStoreInfo(store: StoreInfo) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
}

async function request<T>(method: string, path: string, body?: unknown, bodyIsForm = false): Promise<T> {
  const auth = getAuth()
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(bodyIsForm ? {} : { 'Content-Type': 'application/json' }),
      ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    body: body !== undefined ? (bodyIsForm ? (body as FormData) : JSON.stringify(body)) : undefined,
  })

  // 401 dengan token = sesi berakhir; tanpa token (mis. login salah) = biarkan pesan error asli API
  if (res.status === 401 && auth) {
    clearAuth()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new Error('Sesi berakhir. Silakan login kembali.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Terjadi kesalahan pada server')
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, bodyIsForm = false) => request<T>('POST', path, body, bodyIsForm),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),

  // Download file yang butuh header auth (CSV)
  download: async (path: string, filename: string) => {
    const auth = getAuth()
    const res = await fetch(`${API_URL}${path}`, {
      headers: auth ? { Authorization: `Bearer ${auth.token}` } : {},
    })
    if (!res.ok) throw new Error('Gagal mengunduh file')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
}

export const homeFor = (role: string) => (role === 'admin' ? '/admin' : '/kasir')

export const DEFAULT_STORE: StoreInfo = { store_name: 'Sedap POS', tagline: 'Point of Sale F&B' }

// Path aset relatif (/branding/...) → URL absolut ke server API
export function assetUrl(path?: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${API_URL.replace(/\/api$/, '')}${path}`
}
