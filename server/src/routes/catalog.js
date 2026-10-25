// Sedap POS — katalog: kategori, produk, modifier, meja, meta toko
import { Router } from 'express'
import { db, getRates, getSettings } from '../db.js'

const r = Router()

r.get('/meta', (req, res) => {
  const s = getSettings()
  res.json({
    store_name: s.store_name || 'Sedap POS',
    tagline: s.tagline || 'Point of Sale F&B',
    receipt_footer: s.receipt_footer || 'Terima kasih atas kunjungan Anda!',
    logo_url: s.logo_url || null,
    rates: getRates(),
  })
})

r.get('/categories', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort, c.id
  `).all()
  res.json(rows)
})

r.get('/products', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, c.name AS category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    ORDER BY c.sort, c.id, p.sort, p.id
  `).all()
  const withMods = rows.map((p) => ({
    ...p,
    modifiers: db.prepare(`
      SELECT m.id, m.group_name, m.name, m.price
      FROM product_modifiers pm JOIN modifiers m ON m.id = pm.modifier_id
      WHERE pm.product_id = ? ORDER BY m.group_name, m.price
    `).all(p.id),
  }))
  res.json(withMods)
})

r.get('/modifiers', (req, res) => {
  res.json(db.prepare('SELECT * FROM modifiers ORDER BY group_name, price').all())
})

r.get('/tables', (req, res) => {
  res.json(db.prepare('SELECT * FROM tables ORDER BY id').all())
})

export default r
