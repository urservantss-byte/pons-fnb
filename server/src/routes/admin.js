// Sedap POS — panel admin: users, kategori, produk, modifier, meja, pengaturan, stok
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { Router } from 'express'
import multer from 'multer'
import { db, nowStr, getSettings } from '../db.js'
import { bad, str, intOf, money } from '../helpers.js'
import { hash, adminOnly } from '../auth.js'

const r = Router()
r.use(adminOnly)

/* ---------- USERS ---------- */
const safeUser = (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, is_active: u.is_active, created_at: u.created_at })

r.get('/users', (req, res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY id').all().map(safeUser))
})

r.post('/users', (req, res) => {
  const name = str(req.body.name, 80)
  const username = str(req.body.username, 30).toLowerCase()
  const password = str(req.body.password, 100)
  const role = str(req.body.role, 20) === 'admin' ? 'admin' : 'cashier'
  if (!name || !username || password.length < 6) throw bad(400, 'Nama, username wajib; password minimal 6 karakter')
  if (!/^[a-z0-9_.]+$/.test(username)) throw bad(400, 'Username hanya boleh huruf kecil, angka, titik, underscore')

  const exist = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exist) throw bad(400, 'Username sudah dipakai')

  const rs = db.prepare(
    'INSERT INTO users (name, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(name, username, hash(password), role, nowStr())
  res.status(201).json(safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(rs.lastInsertRowid)))
})

r.patch('/users/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!u) throw bad(404, 'User tidak ditemukan')

  const name = req.body.name !== undefined ? str(req.body.name, 80) : u.name
  const role = req.body.role !== undefined ? (str(req.body.role, 20) === 'admin' ? 'admin' : 'cashier') : u.role
  let isActive = u.is_active
  if (req.body.is_active !== undefined) {
    if (u.id === req.user.id && !intOf(req.body.is_active, 1)) throw bad(400, 'Tidak bisa menonaktifkan akun sendiri')
    isActive = intOf(req.body.is_active, 1) ? 1 : 0
  }

  db.prepare('UPDATE users SET name = ?, role = ?, is_active = ? WHERE id = ?').run(name, role, isActive, u.id)

  if (req.body.password) {
    const password = str(req.body.password, 100)
    if (password.length < 6) throw bad(400, 'Password minimal 6 karakter')
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash(password), u.id)
  }
  res.json(safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)))
})

// Hirarki: admin tak bisa dihapus manual, cukup nonaktif (riwayat transaksi menaut ke user)
r.delete('/users/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!u) throw bad(404, 'User tidak ditemukan')
  if (u.id === req.user.id) throw bad(400, 'Tidak bisa menghapus akun sendiri')
  const activeAdmins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_active = 1").get().c
  if (u.role === 'admin' && activeAdmins <= 1) throw bad(400, 'Minimal harus ada satu admin aktif')

  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(u.id)
  res.json({ ok: true, message: 'User dinonaktifkan (riwayat transaksi tetap tersimpan)' })
})

/* ---------- KATEGORI ---------- */
r.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort, id').all())
})

r.post('/categories', (req, res) => {
  const name = str(req.body.name, 50)
  if (!name) throw bad(400, 'Nama kategori wajib diisi')
  const rs = db.prepare('INSERT INTO categories (name, emoji, sort, created_at) VALUES (?, ?, ?, ?)')
    .run(name, str(req.body.emoji, 8) || '🍽️', intOf(req.body.sort, 0), nowStr())
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(rs.lastInsertRowid))
})

r.patch('/categories/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!c) throw bad(404, 'Kategori tidak ditemukan')
  const name = req.body.name !== undefined ? str(req.body.name, 50) : c.name
  const emoji = req.body.emoji !== undefined ? (str(req.body.emoji, 8) || '🍽️') : c.emoji
  const sort = req.body.sort !== undefined ? intOf(req.body.sort, 0) : c.sort
  db.prepare('UPDATE categories SET name = ?, emoji = ?, sort = ? WHERE id = ?').run(name, emoji, sort, c.id)
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(c.id))
})

r.delete('/categories/:id', (req, res) => {
  const used = db.prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?').get(req.params.id).c
  if (used) throw bad(400, `Kategori masih dipakai ${used} produk — pindahkan produk dulu`)
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

/* ---------- PRODUK ---------- */
const readModifiers = () => {
  const rel = db.prepare('SELECT product_id, modifier_id FROM product_modifiers').all()
  const map = {}
  for (const row of rel) (map[row.product_id] ||= []).push(row.modifier_id)
  return map
}

r.get('/products', (req, res) => {
  const modMap = readModifiers()
  const rows = db.prepare(`
    SELECT p.*, c.name AS category_name FROM products p
    JOIN categories c ON c.id = p.category_id ORDER BY c.sort, p.sort, p.id
  `).all()
  res.json(rows.map((p) => ({ ...p, modifier_ids: modMap[p.id] || [] })))
})

const validateProduct = (body, existing) => {
  const name = body.name !== undefined ? str(body.name, 100) : existing?.name
  if (!name) throw bad(400, 'Nama produk wajib diisi')
  const category_id = body.category_id !== undefined ? intOf(body.category_id, 0) : existing?.category_id
  if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id)) throw bad(400, 'Kategori tidak ditemukan')
  const price = body.price !== undefined ? money(body.price) : existing?.price
  const cost = body.cost !== undefined ? money(body.cost) : (existing?.cost ?? 0)
  if (cost > price) throw bad(400, 'HPP tidak boleh melebihi harga jual')
  const stock = body.stock !== undefined ? intOf(body.stock, -1) : (existing?.stock ?? -1)
  if (stock < -1) throw bad(400, 'Stok tidak valid (-1 = tanpa pelacakan)')
  return {
    name,
    category_id,
    description: body.description !== undefined ? str(body.description, 300) : (existing?.description || ''),
    emoji: body.emoji !== undefined ? (str(body.emoji, 8) || '🍽️') : (existing?.emoji || '🍽️'),
    price,
    cost,
    stock,
    low_stock_at: body.low_stock_at !== undefined ? intOf(body.low_stock_at, 5) : (existing?.low_stock_at ?? 5),
    is_available: body.is_available !== undefined ? (intOf(body.is_available, 1) ? 1 : 0) : (existing?.is_available ?? 1),
    sort: body.sort !== undefined ? intOf(body.sort, 0) : (existing?.sort ?? 0),
  }
}

const syncModifiers = (productId, modIds) => {
  db.prepare('DELETE FROM product_modifiers WHERE product_id = ?').run(productId)
  const ins = db.prepare('INSERT OR IGNORE INTO product_modifiers (product_id, modifier_id) VALUES (?, ?)')
  for (const id of modIds) {
    if (db.prepare('SELECT id FROM modifiers WHERE id = ?').get(intOf(id, 0))) ins.run(productId, intOf(id, 0))
  }
}

// ====== Foto produk ======
const PRODUCTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.data', 'products')
fs.mkdirSync(PRODUCTS_DIR, { recursive: true })
const photoUpload = multer({
  storage: multer.diskStorage({
    destination: PRODUCTS_DIR,
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.png').toLowerCase()
      cb(null, `p${req.params.id}-${Date.now()}${ext}`)
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|avif)$/.test(file.mimetype)),
})

// Tempat file foto: /branding (dilayani publik) supaya halaman login pun bisa memuat
const removeProductPhoto = async (photoUrl) => {
  if (!photoUrl) return
  const m = String(photoUrl).match(/products\/([^/?]+)/)
  if (m) await fs.promises.rm(path.join(PRODUCTS_DIR, m[1])).catch(() => {})
}

r.post('/products', (req, res) => {
  const p = validateProduct(req.body, null)
  const rs = db.prepare(`
    INSERT INTO products (category_id, name, description, emoji, price, cost, stock, low_stock_at, is_available, sort, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(p.category_id, p.name, p.description, p.emoji, p.price, p.cost, p.stock, p.low_stock_at, p.is_available, p.sort, nowStr())
  if (Array.isArray(req.body.modifier_ids)) syncModifiers(rs.lastInsertRowid, req.body.modifier_ids)
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(rs.lastInsertRowid))
})

// Upload foto produk (hasil crop square dari browser — dikirim sebagai blob webp)
r.post('/products/:id/photo', photoUpload.single('file'), (req, res) => {
  const existing = db.prepare('SELECT id, photo_url FROM products WHERE id = ?').get(req.params.id)
  if (!existing) throw bad(404, 'Produk tidak ditemukan')
  if (!req.file) throw bad(400, 'File tidak valid — gunakan PNG/JPG/WebP maksimal 2MB')
  // Hapus foto lama (fisik) bila ada
  removeProductPhoto(existing.photo_url)
  const url = `/branding/products/${req.file.filename}?v=${Date.now()}`
  db.prepare('UPDATE products SET photo_url = ? WHERE id = ?').run(url, existing.id)
  res.json({ ...db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id) })
})

r.delete('/products/:id/photo', async (req, res) => {
  const existing = db.prepare('SELECT id, photo_url FROM products WHERE id = ?').get(req.params.id)
  if (!existing) throw bad(404, 'Produk tidak ditemukan')
  await removeProductPhoto(existing.photo_url)
  db.prepare('UPDATE products SET photo_url = NULL WHERE id = ?').run(existing.id)
  res.json({ ok: true })
})

r.patch('/products/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) throw bad(404, 'Produk tidak ditemukan')
  const p = validateProduct(req.body, existing)
  db.prepare(`
    UPDATE products SET category_id = ?, name = ?, description = ?, emoji = ?, price = ?, cost = ?,
      stock = ?, low_stock_at = ?, is_available = ?, sort = ? WHERE id = ?
  `).run(p.category_id, p.name, p.description, p.emoji, p.price, p.cost, p.stock, p.low_stock_at, p.is_available, p.sort, existing.id)
  if (Array.isArray(req.body.modifier_ids)) syncModifiers(existing.id, req.body.modifier_ids)
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id))
})

r.delete('/products/:id', async (req, res) => {
  const existing = db.prepare('SELECT id, photo_url FROM products WHERE id = ?').get(req.params.id)
  if (!existing) throw bad(404, 'Produk tidak ditemukan')
  await removeProductPhoto(existing.photo_url)
  db.prepare('DELETE FROM products WHERE id = ?').run(existing.id)
  res.json({ ok: true })
})

// Stok masuk / penyesuaian
r.post('/products/:id/stock', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!p) throw bad(404, 'Produk tidak ditemukan')
  const type = str(req.body.type, 10)
  if (!['in', 'adjust'].includes(type)) throw bad(400, 'Tipe harus "in" (stok masuk) atau "adjust" (set stok)')
  const qty = intOf(req.body.qty, -1)
  if (qty < 0) throw bad(400, 'Jumlah tidak valid')
  const note = str(req.body.note, 200)

  const newStock = type === 'in' ? (p.stock < 0 ? qty : p.stock + qty) : qty
  db.transaction(() => {
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, p.id)
    db.prepare('INSERT INTO stock_movements (product_id, user_id, type, qty, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(p.id, req.user.id, type === 'in' ? 'in' : 'adjust', qty, note || (type === 'in' ? 'Stok masuk' : `Set stok jadi ${qty}`), nowStr())
  })()
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(p.id))
})

r.get('/stock-movements', (req, res) => {
  const productId = intOf(req.query.product_id, 0)
  const rows = productId
    ? db.prepare('SELECT s.*, p.name AS product_name FROM stock_movements s JOIN products p ON p.id = s.product_id WHERE s.product_id = ? ORDER BY s.id DESC LIMIT 100').all(productId)
    : db.prepare('SELECT s.*, p.name AS product_name FROM stock_movements s JOIN products p ON p.id = s.product_id ORDER BY s.id DESC LIMIT 100').all()
  res.json(rows)
})

/* ---------- MODIFIER ---------- */
r.get('/modifiers', (req, res) => {
  const mods = db.prepare(`
    SELECT m.*, COUNT(pm.product_id) AS product_count
    FROM modifiers m LEFT JOIN product_modifiers pm ON pm.modifier_id = m.id
    GROUP BY m.id ORDER BY m.group_name, m.price
  `).all()
  res.json(mods)
})

r.post('/modifiers', (req, res) => {
  const groupName = str(req.body.group_name, 50)
  const name = str(req.body.name, 50)
  if (!groupName || !name) throw bad(400, 'Nama grup dan opsi modifier wajib diisi')
  const price = req.body.price !== undefined ? money(req.body.price) : 0
  const rs = db.prepare('INSERT INTO modifiers (group_name, name, price) VALUES (?, ?, ?)').run(groupName, name, price)
  res.status(201).json(db.prepare('SELECT * FROM modifiers WHERE id = ?').get(rs.lastInsertRowid))
})

r.put('/modifiers/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM modifiers WHERE id = ?').get(req.params.id)
  if (!existing) throw bad(404, 'Modifier tidak ditemukan')
  const groupName = req.body.group_name !== undefined ? str(req.body.group_name, 50) : existing.group_name
  const name = req.body.name !== undefined ? str(req.body.name, 50) : existing.name
  if (!groupName || !name) throw bad(400, 'Nama grup dan opsi modifier wajib diisi')
  const price = req.body.price !== undefined ? money(req.body.price) : existing.price
  db.prepare('UPDATE modifiers SET group_name = ?, name = ?, price = ? WHERE id = ?').run(groupName, name, price, existing.id)
  res.json(db.prepare('SELECT * FROM modifiers WHERE id = ?').get(existing.id))
})

r.delete('/modifiers/:id', (req, res) => {
  db.prepare('DELETE FROM modifiers WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

/* ---------- MEJA ---------- */
r.get('/tables', (req, res) => {
  res.json(db.prepare('SELECT * FROM tables ORDER BY id').all())
})

r.post('/tables', (req, res) => {
  const name = str(req.body.name, 30)
  if (!name) throw bad(400, 'Nama meja wajib diisi')
  const capacity = Math.max(1, intOf(req.body.capacity, 2))
  const rs = db.prepare('INSERT INTO tables (name, capacity, status, created_at) VALUES (?, ?, ?, ?)')
    .run(name, capacity, 'available', nowStr())
  res.status(201).json(db.prepare('SELECT * FROM tables WHERE id = ?').get(rs.lastInsertRowid))
})

r.patch('/tables/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id)
  if (!t) throw bad(404, 'Meja tidak ditemukan')
  const name = req.body.name !== undefined ? str(req.body.name, 30) : t.name
  const capacity = req.body.capacity !== undefined ? Math.max(1, intOf(req.body.capacity, 2)) : t.capacity
  const status = req.body.status !== undefined && ['available', 'occupied', 'reserved'].includes(str(req.body.status, 20))
    ? str(req.body.status, 20) : t.status
  db.prepare('UPDATE tables SET name = ?, capacity = ?, status = ? WHERE id = ?').run(name, capacity, status, t.id)
  res.json(db.prepare('SELECT * FROM tables WHERE id = ?').get(t.id))
})

r.delete('/tables/:id', (req, res) => {
  const busy = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE table_id = ? AND status = 'open'").get(req.params.id).c
  if (busy) throw bad(400, 'Meja masih dipakai pesanan aktif')
  db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

/* ---------- PENGATURAN ---------- */
const BRANDING_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.data', 'branding')
const LOGO_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif']
const logoUpload = multer({
  storage: multer.diskStorage({
    destination: BRANDING_DIR,
    filename: (req, file, cb) => cb(null, `logo${(path.extname(file.originalname) || '.png').toLowerCase()}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|svg\+xml|avif)$/.test(file.mimetype)),
})
const removeOtherLogos = async (keepExt) => {
  for (const e of LOGO_EXTS.filter((x) => x !== keepExt)) {
    await fs.promises.rm(path.join(BRANDING_DIR, `logo${e}`)).catch(() => {})
  }
}
const logoUpsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
const logoUrlWithBust = (filename) => `/branding/${filename}?v=${Date.now()}`

r.post('/branding/logo', logoUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File tidak valid — gunakan PNG/JPG/WebP/SVG maksimal 2MB' })
  await removeOtherLogos(path.extname(req.file.filename))
  const url = logoUrlWithBust(req.file.filename)
  logoUpsert.run('logo_url', url)
  res.json({ logo_url: url })
})

r.delete('/branding/logo', async (req, res) => {
  await removeOtherLogos(null)
  db.prepare("DELETE FROM settings WHERE key = 'logo_url'").run()
  res.json({ ok: true })
})

r.get('/settings', (req, res) => res.json(getSettings()))

r.put('/settings', (req, res) => {
  const allowed = ['store_name', 'tagline', 'receipt_footer', 'tax_enabled', 'tax_pct', 'service_enabled', 'service_pct']
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  for (const key of allowed) {
    if (req.body[key] === undefined) continue
    let value = req.body[key]
    if (key.endsWith('_enabled')) value = value ? '1' : '0'
    if (key.endsWith('_pct')) value = String(Math.max(0, Math.min(50, Number(value) || 0)))
    up.run(key, str(value, 300))
  }
  res.json(getSettings())
})

export default r
