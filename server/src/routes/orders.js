// Sedap POS — orders: draft/parkir, item, diskon, pembayaran, void
import { Router } from 'express'
import { db, nowStr, getRates } from '../db.js'
import { bad, str, intOf, money, nextOrderNumber, computeTotals } from '../helpers.js'
import { adminOnly } from '../auth.js'

const r = Router()

const loadOrder = (id) => db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
const loadItems = (orderId) => db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId)
const orderFull = (id) => {
  const o = db.prepare(`
    SELECT o.*, u.name AS cashier_name,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
  `).get(id)
  if (!o) throw bad(404, 'Pesanan tidak ditemukan')
  o.items = loadItems(id)
  o.table_name = o.table_id ? db.prepare('SELECT name FROM tables WHERE id = ?').get(o.table_id)?.name : o.table_name
  return o
}
const orderSubtotal = (orderId) =>
  db.prepare('SELECT COALESCE(SUM(line_total),0) AS s FROM order_items WHERE order_id = ?').get(orderId).s

const refreshSubtotal = (orderId) => {
  db.prepare('UPDATE orders SET subtotal = ? WHERE id = ?').run(orderSubtotal(orderId), orderId)
}

const assertOpen = (o) => {
  if (o.status !== 'open') throw bad(400, 'Pesanan sudah dibayar/void, tidak bisa diubah')
}

const freeTable = (tableId) => {
  if (tableId) db.prepare("UPDATE tables SET status = 'available' WHERE id = ?").run(tableId)
}

// Buat pesanan baru (draft / parkir)
r.post('/', (req, res) => {
  const type = str(req.body.type, 20)
  if (!['dine-in', 'takeaway', 'delivery'].includes(type)) throw bad(400, 'Tipe pesanan tidak valid')

  let tableId = null
  let tableName = ''
  if (type === 'dine-in') {
    tableId = intOf(req.body.table_id, 0)
    const t = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId)
    if (!t) throw bad(400, 'Meja tidak ditemukan — pilih meja dulu')
    if (t.status === 'occupied') throw bad(400, `Meja ${t.name} sedang terisi`)
    tableName = t.name
  }

  // Satu shift aktif per kasir agar mutasi kas tercatat benar
  const shift = db.prepare("SELECT * FROM shifts WHERE user_id = ? AND status = 'open'").get(req.user.id)
  if (!shift) throw bad(400, 'Buka shift kasir dulu sebelum menerima pesanan')

  const info = db.transaction(() => {
    const num = nextOrderNumber()
    const rs = db.prepare(`
      INSERT INTO orders (order_number, type, table_id, table_name, shift_id, user_id,
        customer_name, customer_phone, subtotal, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'open', ?, ?)
    `).run(num, type, tableId, tableName, shift.id, req.user.id,
      str(req.body.customer_name, 80), str(req.body.customer_phone, 20),
      str(req.body.notes, 300), nowStr())
    db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(tableId)
    return rs.lastInsertRowid
  })()

  res.status(201).json(orderFull(info))
})

r.get('/', (req, res) => {
  const status = str(req.query.status, 20)
  const limit = Math.min(intOf(req.query.limit, 50), 200)
  // mine=1 → hanya transaksi yang dilayani kasir ini (untuk riwayat kasir)
  const mine = req.query.mine === '1' ? req.user.id : null
  const conds = []
  const params = []
  // Riwayat: void disembunyikan kecuali diminta eksplisit (?status=void)
  if (status) { conds.push('o.status = ?'); params.push(status) } else { conds.push("o.status != 'void'") }
  if (mine) { conds.push('o.user_id = ?'); params.push(mine) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const rows = db.prepare(`
    SELECT o.*, u.name AS cashier_name,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o JOIN users u ON u.id = o.user_id
    ${where}
    ORDER BY o.created_at DESC LIMIT ?
  `).all(...params, limit)
  res.json(rows)
})

r.get('/:id', (req, res) => {
  res.json(orderFull(intOf(req.params.id)))
})

// Tambah item ke pesanan
r.post('/:id/items', (req, res) => {
  const o = loadOrder(req.params.id)
  if (!o) throw bad(404, 'Pesanan tidak ditemukan')
  assertOpen(o)

  const productId = intOf(req.body.product_id, 0)
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(productId)
  if (!p) throw bad(404, 'Produk tidak ditemukan')
  if (!p.is_available) throw bad(400, `${p.name} sedang tidak tersedia`)

  const qty = intOf(req.body.qty, 1)
  if (qty < 1 || qty > 99) throw bad(400, 'Jumlah tidak valid (1-99)')

  // Validasi stok untuk produk yang di-track
  const inCart = db.prepare(
    "SELECT COALESCE(SUM(qty),0) AS q FROM order_items WHERE order_id = ? AND product_id = ?"
  ).get(o.id, p.id).q
  if (p.stock >= 0 && inCart + qty > p.stock) {
    throw bad(400, `Stok ${p.name} tidak cukup (tersisa ${p.stock - inCart})`)
  }

  // Modifier milik produk ini saja
  const modIds = Array.isArray(req.body.modifier_ids) ? req.body.modifier_ids.map((m) => intOf(m, 0)) : []
  const mods = modIds.length
    ? db.prepare(`
        SELECT m.* FROM modifiers m JOIN product_modifiers pm ON pm.modifier_id = m.id
        WHERE pm.product_id = ? AND m.id IN (${modIds.join(',')})
      `).all(p.id)
    : []
  const modPrice = mods.reduce((s, m) => s + m.price, 0)
  const unitPrice = p.price + modPrice
  const lineTotal = unitPrice * qty

  db.transaction(() => {
    db.prepare(`
      INSERT INTO order_items (order_id, product_id, name, unit_price, qty, modifiers, line_total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(o.id, p.id, p.name, unitPrice, qty, JSON.stringify(mods.map((m) => ({ id: m.id, name: m.name, price: m.price }))),
      lineTotal, str(req.body.notes, 200))
    refreshSubtotal(o.id)
  })()

  res.status(201).json(orderFull(o.id))
})

// Ubah qty / catatan item
r.patch('/:id/items/:itemId', (req, res) => {
  const o = loadOrder(req.params.id)
  if (!o) throw bad(404, 'Pesanan tidak ditemukan')
  assertOpen(o)

  const item = db.prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?').get(req.params.itemId, o.id)
  if (!item) throw bad(404, 'Item tidak ditemukan')

  const qty = req.body.qty !== undefined ? intOf(req.body.qty, item.qty) : item.qty
  if (qty < 1 || qty > 99) throw bad(400, 'Jumlah tidak valid (1-99)')
  const notes = req.body.notes !== undefined ? str(req.body.notes, 200) : item.notes

  if (item.product_id) {
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id)
    if (p && p.stock >= 0) {
      const others = db.prepare(
        'SELECT COALESCE(SUM(qty),0) AS q FROM order_items WHERE order_id = ? AND product_id = ? AND id != ?'
      ).get(o.id, p.id, item.id).q
      if (others + qty > p.stock) throw bad(400, `Stok ${p.name} tidak cukup (tersisa ${p.stock - others})`)
    }
  }

  db.transaction(() => {
    db.prepare('UPDATE order_items SET qty = ?, notes = ?, line_total = ? WHERE id = ?')
      .run(qty, notes, item.unit_price * qty, item.id)
    refreshSubtotal(o.id)
  })()

  res.json(orderFull(o.id))
})

// Hapus item
r.delete('/:id/items/:itemId', (req, res) => {
  const o = loadOrder(req.params.id)
  if (!o) throw bad(404, 'Pesanan tidak ditemukan')
  assertOpen(o)
  const item = db.prepare('SELECT id FROM order_items WHERE id = ? AND order_id = ?').get(req.params.itemId, o.id)
  if (!item) throw bad(404, 'Item tidak ditemukan')
  db.transaction(() => {
    db.prepare('DELETE FROM order_items WHERE id = ?').run(item.id)
    refreshSubtotal(o.id)
  })()
  res.json(orderFull(o.id))
})

// Ubah diskon / catatan / info pelanggan sebelum bayar
r.patch('/:id', (req, res) => {
  const o = loadOrder(req.params.id)
  if (!o) throw bad(404, 'Pesanan tidak ditemukan')
  assertOpen(o)

  const discount = req.body.discount !== undefined ? money(req.body.discount) : o.discount
  if (discount > o.subtotal) throw bad(400, 'Diskon tidak boleh melebihi subtotal')
  const notes = req.body.notes !== undefined ? str(req.body.notes, 300) : o.notes
  const customerName = req.body.customer_name !== undefined ? str(req.body.customer_name, 80) : o.customer_name
  const customerPhone = req.body.customer_phone !== undefined ? str(req.body.customer_phone, 20) : o.customer_phone

  db.prepare('UPDATE orders SET discount = ?, notes = ?, customer_name = ?, customer_phone = ? WHERE id = ?')
    .run(discount, notes, customerName, customerPhone, o.id)

  res.json(orderFull(o.id))
})

// Bayar (final) — potong stok, bebaskan meja, tutup tiket
r.post('/:id/pay', (req, res) => {
  const o = loadOrder(req.params.id)
  if (!o) throw bad(404, 'Pesanan tidak ditemukan')
  assertOpen(o)

  const items = loadItems(o.id)
  if (!items.length) throw bad(400, 'Keranjang masih kosong')

  const method = str(req.body.payment_method, 20)
  if (!['cash', 'qris', 'debit', 'credit'].includes(method)) throw bad(400, 'Metode bayar tidak valid')

  // Data pelanggan boleh diisi/diperbarui saat pembayaran (delivery/bungkus)
  const customerName = req.body.customer_name !== undefined ? str(req.body.customer_name, 80) : o.customer_name
  const customerPhone = req.body.customer_phone !== undefined ? str(req.body.customer_phone, 20) : o.customer_phone

  const discount = req.body.discount !== undefined ? money(req.body.discount) : o.discount
  if (discount > o.subtotal) throw bad(400, 'Diskon tidak boleh melebihi subtotal')

  const rates = getRates()
  const totals = computeTotals(o.subtotal, discount, rates)

  let paidAmount = totals.total
  if (method === 'cash') {
    paidAmount = money(req.body.paid_amount)
    if (paidAmount < totals.total) throw bad(400, 'Uang dibayar kurang dari total tagihan')
  }
  const change = method === 'cash' ? paidAmount - totals.total : 0

  db.transaction(() => {
    // Validasi ulang stok saat pembayaran
    for (const it of items) {
      if (!it.product_id) continue
      const p = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id)
      if (!p || p.stock < 0) continue
      if (p.stock < it.qty) throw bad(400, `Stok ${it.name} tinggal ${p.stock}, tidak cukup`)
    }
    for (const it of items) {
      if (!it.product_id) continue
      const p = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id)
      if (!p || p.stock < 0) continue
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(it.qty, it.product_id)
      db.prepare("INSERT INTO stock_movements (product_id, user_id, type, qty, note, created_at) VALUES (?, ?, 'sale', ?, ?, ?)")
        .run(it.product_id, req.user.id, it.qty, `Penjualan ${o.order_number}`, nowStr())
    }

    db.prepare(`
      UPDATE orders SET discount = ?, tax_rate = ?, service_rate = ?, tax_amount = ?, service_amount = ?,
        total = ?, payment_method = ?, paid_amount = ?, change_amount = ?, status = 'paid', paid_at = ?,
        customer_name = ?, customer_phone = ?
      WHERE id = ?
    `).run(totals.discount, rates.tax_pct, rates.service_pct, totals.tax_amount, totals.service_amount,
      totals.total, method, paidAmount, change, nowStr(), customerName, customerPhone, o.id)

    freeTable(o.table_id)
  })()

  res.json(orderFull(o.id))
})

// Void / batalkan
r.post('/:id/void', (req, res) => {
  const o = loadOrder(req.params.id)
  if (!o) throw bad(404, 'Pesanan tidak ditemukan')

  if (o.status === 'paid') {
    // Void(transaksi lunas) butuh admin + stok dikembalikan
    adminOnly(req, res, () => {})
    if (res.headersSent) return
    db.transaction(() => {
      for (const it of loadItems(o.id)) {
        if (!it.product_id) continue
        const p = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id)
        if (!p || p.stock < 0) continue
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.qty, it.product_id)
        db.prepare("INSERT INTO stock_movements (product_id, user_id, type, qty, note, created_at) VALUES (?, ?, 'in', ?, ?, ?)")
          .run(it.product_id, req.user.id, it.qty, `Void ${o.order_number}`, nowStr())
      }
      db.prepare("UPDATE orders SET status = 'void', notes = COALESCE(?,'') WHERE id = ?")
        .run(`${o.notes} | VOID: ${str(req.body.reason, 200)}`, o.id)
      freeTable(o.table_id)
    })()
    return res.json(orderFull(o.id))
  }

  // Draft/open boleh dibatalkan kasirnya
  db.transaction(() => {
    db.prepare("UPDATE orders SET status = 'void' WHERE id = ?").run(o.id)
    freeTable(o.table_id)
  })()
  res.json(orderFull(o.id))
})

export default r
