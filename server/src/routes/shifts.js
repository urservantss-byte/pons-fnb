// Sedap POS — shift kasir: buka, tutup, ringkasan
import { Router } from 'express'
import { db, nowStr } from '../db.js'
import { bad, intOf, str } from '../helpers.js'

const r = Router()

const shiftSummary = (shift) => {
  const base = db.prepare(`
    SELECT
      COUNT(*) AS orders_count,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total END), 0) AS cash_total,
      COALESCE(SUM(CASE WHEN payment_method = 'qris'  THEN total END), 0) AS qris_total,
      COALESCE(SUM(CASE WHEN payment_method = 'debit' THEN total END), 0) AS debit_total,
      COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total END), 0) AS credit_total
    FROM orders WHERE shift_id = ? AND status = 'paid'
  `).get(shift.id)

  const items = db.prepare(`
    SELECT COALESCE(SUM(oi.qty), 0) AS qty FROM order_items oi
    JOIN orders o ON o.id = oi.order_id WHERE o.shift_id = ? AND o.status = 'paid'
  `).get(shift.id).qty

  const expectedCash = shift.starting_cash + base.cash_total
  return {
    ...shift,
    expected_cash: expectedCash,
    cash_total: base.cash_total,
    qris_total: base.qris_total,
    debit_total: base.debit_total,
    credit_total: base.credit_total,
    revenue_total: base.cash_total + base.qris_total + base.debit_total + base.credit_total,
    orders_count: base.orders_count,
    items_sold: items,
  }
}

r.post('/open', (req, res) => {
  const open = db.prepare("SELECT id FROM shifts WHERE user_id = ? AND status = 'open'").get(req.user.id)
  if (open) throw bad(400, 'Masih ada shift yang terbuka — tutup dulu shift sebelumnya')

  const startingCash = intOf(req.body.starting_cash, 0)
  if (startingCash < 0) throw bad(400, 'Modal awal kas tidak valid')

  const rs = db.prepare(
    "INSERT INTO shifts (user_id, started_at, starting_cash, status) VALUES (?, ?, ?, 'open')"
  ).run(req.user.id, nowStr(), startingCash)

  res.status(201).json(shiftSummary(db.prepare('SELECT * FROM shifts WHERE id = ?').get(rs.lastInsertRowid)))
})

r.get('/current', (req, res) => {
  const shift = db.prepare("SELECT * FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY id DESC").get(req.user.id)
  if (!shift) return res.json(null)
  res.json(shiftSummary(shift))
})

r.post('/:id/close', (req, res) => {
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id)
  if (!shift) throw bad(404, 'Shift tidak ditemukan')
  if (shift.status === 'closed') throw bad(400, 'Shift ini sudah ditutup')
  if (shift.user_id !== req.user.id && req.user.role !== 'admin') throw bad(403, 'Hanya pemilik shift atau admin yang bisa menutup')

  const endingCash = intOf(req.body.ending_cash, 0)
  const sum = shiftSummary(shift)

  db.prepare('UPDATE shifts SET ended_at = ?, ending_cash = ?, status = ? WHERE id = ?')
    .run(nowStr(), endingCash, 'closed', shift.id)

  res.json({
    ...sum,
    ending_cash: endingCash,
    cash_difference: endingCash - sum.expected_cash,
    status: 'closed',
  })
})

// Riwayat shift (untuk laporan admin)
r.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, u.name AS user_name FROM shifts s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.started_at DESC LIMIT 100
  `).all()
  res.json(rows.map(shiftSummary))
})

export default r
