// Sedap POS — JWT + bcrypt + middleware auth
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { db, getSettings } from './db.js'

const SECRET = process.env.JWT_SECRET || 'sedap-pos-dev-secret-2026'

export const sign = (user) => {
  const s = getSettings()
  return jwt.sign({ id: user.id, role: user.role, store_name: s.store_name || 'Sedap POS', tagline: s.tagline || 'Point of Sale F&B', logo_url: s.logo_url || null }, SECRET, { expiresIn: '7d' })
}
export const verify = (token) => {
  try { return jwt.verify(token, SECRET) } catch { return null }
}
export const hash = (pw) => bcrypt.hashSync(String(pw), 10)
export const check = (pw, pwHash) => bcrypt.compareSync(String(pw), pwHash)

export function authRequired(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  const payload = token ? verify(token) : null
  if (!payload) return res.status(401).json({ error: 'Sesi tidak valid, silakan login kembali' })
  const user = db.prepare('SELECT id, name, username, role, is_active FROM users WHERE id = ?').get(payload.id)
  if (!user || !user.is_active) return res.status(401).json({ error: 'Akun tidak ditemukan atau nonaktif' })
  req.user = user
  next()
}

export const adminOnly = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Aksi ini hanya untuk admin' })
