// Sedap POS — laporan & analitik untuk dashboard admin
import { Router } from 'express'
import { db, todayStr, p2 } from '../db.js'
import { str, intOf } from '../helpers.js'
import { buildSalesWorkbook } from '../export-excel.js'

const r = Router()

// Rentang tanggal aman: default hari ini
const dateRange = (q) => {
  const today = todayStr()
  const from = /^\d{4}-\d{2}-\d{2}$/.test(str(q.from)) ? q.from : today
  const toRaw = /^\d{4}-\d{2}-\d{2}$/.test(str(q.to)) ? q.to : from
  const to = toRaw < from ? from : toRaw
  return { from, to, fromTs: `${from} 00:00:00`, toTs: `${to} 23:59:59` }
}

const summaryFor = (fromTs, toTs) => {
  const s = db.prepare(`
    SELECT
      COUNT(*) AS orders_count,
      COALESCE(SUM(total), 0) AS revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'cash'  THEN total END), 0) AS cash_total,
      COALESCE(SUM(CASE WHEN payment_method = 'qris'  THEN total END), 0) AS qris_total,
      COALESCE(SUM(CASE WHEN payment_method = 'debit' THEN total END), 0) AS debit_total,
      COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total END), 0) AS credit_total,
      COALESCE(SUM(tax_amount + service_amount), 0) AS tax_service
    FROM orders
    WHERE status = 'paid' AND paid_at BETWEEN ? AND ?
  `).get(fromTs, toTs)

  const items = db.prepare(`
    SELECT COALESCE(SUM(oi.qty), 0) AS qty,
           COALESCE(SUM(oi.qty * COALESCE(p.cost, 0)), 0) AS cost
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.status = 'paid' AND o.paid_at BETWEEN ? AND ?
  `).get(fromTs, toTs)

  return {
    orders_count: s.orders_count,
    revenue: s.revenue,
    avg_order: s.orders_count ? Math.round(s.revenue / s.orders_count) : 0,
    items_sold: items.qty,
    // HPP aproksimasi dari cost produk (modifier tak berbiaya)
    est_cost: items.cost,
    est_profit: s.revenue - s.tax_service - items.cost,
    cash_total: s.cash_total,
    qris_total: s.qris_total,
    debit_total: s.debit_total,
    credit_total: s.credit_total,
    tax_service: s.tax_service,
  }
}

// Dashboard admin: KPI hari ini + tren 7 hari + top produk + stok menipis
r.get('/dashboard', (req, res) => {
  const today = todayStr()
  const now = new Date()

  const todayStart = `${today} 00:00:00`
  const todayEnd = `${today} 23:59:59`
  const kpi = summaryFor(todayStart, todayEnd)

  // Tren 7 hari termasuk hari ini
  const trend = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const ds = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
    const s = summaryFor(`${ds} 00:00:00`, `${ds} 23:59:59`)
    trend.push({ date: ds, revenue: s.revenue, orders_count: s.orders_count })
  }

  const topProducts = db.prepare(`
    SELECT oi.name, SUM(oi.qty) AS qty, SUM(oi.line_total) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'paid' AND o.paid_at BETWEEN ? AND ?
    GROUP BY oi.name ORDER BY qty DESC LIMIT 5
  `).all(todayStart, todayEnd)

  const recentOrders = db.prepare(`
    SELECT o.id, o.order_number, o.type, o.total, o.payment_method, o.paid_at, o.status, u.name AS cashier_name
    FROM orders o JOIN users u ON u.id = o.user_id
    WHERE o.status IN ('paid','open') ORDER BY o.id DESC LIMIT 8
  `).all()

  const lowStock = db.prepare(`
    SELECT id, name, emoji, stock, low_stock_at FROM products
    WHERE stock >= 0 AND stock <= low_stock_at AND is_available = 1
    ORDER BY stock ASC LIMIT 8
  `).all()

  const categoryMix = db.prepare(`
    SELECT c.name AS category, SUM(oi.line_total) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    JOIN categories c ON c.id = p.category_id
    WHERE o.status = 'paid' AND o.paid_at BETWEEN ? AND ?
    GROUP BY c.name ORDER BY revenue DESC
  `).all(todayStart, todayEnd)

  res.json({ kpi, trend, top_products: topProducts, recent_orders: recentOrders, low_stock: lowStock, category_mix: categoryMix })
})

// Laporan penjualan periode
r.get('/sales', (req, res) => {
  const { from, to, fromTs, toTs } = dateRange(req.query)
  const summary = summaryFor(fromTs, toTs)

  const prevDays = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1)
  const prevEnd = new Date(from)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(from)
  prevStart.setDate(prevStart.getDate() - prevDays)
  const fmt = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
  const prev = summaryFor(`${fmt(prevStart)} 00:00:00`, `${fmt(prevEnd)} 23:59:59`)

  const bestSellers = db.prepare(`
    SELECT oi.name, SUM(oi.qty) AS qty, SUM(oi.line_total) AS revenue,
           AVG(oi.unit_price) AS avg_price
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'paid' AND o.paid_at BETWEEN ? AND ?
    GROUP BY oi.name ORDER BY qty DESC LIMIT 20
  `).all(fromTs, toTs)

  const hourly = db.prepare(`
    SELECT CAST(strftime('%H', o.paid_at) AS INTEGER) AS hour, SUM(o.total) AS revenue, COUNT(*) AS orders_count
    FROM orders o
    WHERE o.status = 'paid' AND o.paid_at BETWEEN ? AND ?
    GROUP BY hour ORDER BY hour
  `).all(fromTs, toTs)

  const daily = db.prepare(`
    SELECT strftime('%Y-%m-%d', o.paid_at) AS date, SUM(o.total) AS revenue, COUNT(*) AS orders_count
    FROM orders o
    WHERE o.status = 'paid' AND o.paid_at BETWEEN ? AND ?
    GROUP BY date ORDER BY date
  `).all(fromTs, toTs)

  const byType = db.prepare(`
    SELECT o.type, COUNT(*) AS orders_count, SUM(o.total) AS revenue
    FROM orders o
    WHERE o.status = 'paid' AND o.paid_at BETWEEN ? AND ?
    GROUP BY o.type
  `).all(fromTs, toTs)

  res.json({ from, to, summary, prev, best_sellers: bestSellers, hourly, daily, by_type: byType })
})

// Daftar transaksi (detail untuk tabel + modal)
r.get('/transactions', (req, res) => {
  const { from, to, fromTs, toTs } = dateRange(req.query)
  const status = str(req.query.status, 10)
  const rows = db.prepare(`
    SELECT o.*, u.name AS cashier_name,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o JOIN users u ON u.id = o.user_id
    WHERE o.created_at BETWEEN ? AND ? ${status ? 'AND o.status = ?' : ''}
    ORDER BY o.id DESC LIMIT 500
  `)
  const data = status ? rows.all(fromTs, toTs, status) : rows.all(fromTs, toTs)
  res.json(data)
})

// Export Excel modern (multi-sheet, styled) — default. format=csv masih tersedia.
r.get('/export', async (req, res) => {
  const { from, to, fromTs, toTs } = dateRange(req.query)

  if (str(req.query.format, 6) === 'csv') {
    const rows = db.prepare(`
      SELECT o.order_number, o.created_at, o.type, o.table_name, o.subtotal, o.discount,
        o.tax_amount, o.service_amount, o.total, o.payment_method, o.status, u.name AS cashier,
        (SELECT GROUP_CONCAT(oi.qty || 'x ' || oi.name, '; ') FROM order_items oi WHERE oi.order_id = o.id) AS items
      FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.created_at BETWEEN ? AND ?
      ORDER BY o.id
    `).all(fromTs, toTs)

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = ['No Order', 'Waktu', 'Tipe', 'Meja', 'Subtotal', 'Diskon', 'Pajak', 'Servis', 'Total', 'Metode', 'Status', 'Kasir', 'Item']
    const lines = [header.map(esc).join(',')]
    for (const row of rows) {
      lines.push([row.order_number, row.created_at, row.type, row.table_name || '', row.subtotal, row.discount,
        row.tax_amount, row.service_amount, row.total, row.payment_method || '', row.status, row.cashier, row.items || '']
        .map(esc).join(','))
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="laporan-${fromTs.slice(0,10)}.csv"`)
    return res.send('\uFEFF' + lines.join('\n'))
  }

  try {
    const wb = await buildSalesWorkbook({ from, to, fromTs, toTs })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="laporan-${from}_${to}.xlsx"`)
    await wb.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error('export xlsx gagal:', err)
    res.status(500).json({ error: 'Gagal membuat file Excel' })
  }
})

export default r
