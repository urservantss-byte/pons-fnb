// Sedap POS — auth routes: login, profil
import { Router } from 'express'
import { db, getSettings } from '../db.js'
import { sign, check, authRequired } from '../auth.js'
import { bad, str } from '../helpers.js'

const r = Router()

// Identitas toko — publik untuk halaman login sebelum user punya token
r.get('/store', (req, res) => {
  const s = getSettings()
  res.json({ store_name: s.store_name || 'Sedap POS', tagline: s.tagline || 'Point of Sale F&B', logo_url: s.logo_url || null })
})

r.post('/login', (req, res) => {
  const username = str(req.body.username, 60).toLowerCase()
  const password = str(req.body.password, 200)
  if (!username || !password) throw bad(400, 'Username dan password wajib diisi')

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !check(password, user.password_hash)) throw bad(401, 'Username atau password salah')
  if (!user.is_active) throw bad(403, 'Akun dinonaktifkan, hubungi admin')

  res.json({
    token: sign(user),
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
    store: { store_name: getSettings().store_name || 'Sedap POS', tagline: getSettings().tagline || 'Point of Sale F&B', logo_url: getSettings().logo_url || null },
  })
})

r.get('/me', authRequired, (req, res) => {
  const { password_hash, ...safe } = req.user
  res.json(safe)
})

export default r
