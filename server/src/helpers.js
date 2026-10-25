// Sedap POS — helper validasi, error, nomor order, kalkulasi
import { db, todayStr } from './db.js'

export const bad = (status, error) => {
  const e = new Error(error)
  e.status = status
  return e
}

export const str = (v, max = 500) => {
  if (v === undefined || v === null) return ''
  let s = String(v).trim()
  if (max) s = s.slice(0, max)
  return s
}

export const intOf = (v, dflt = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : dflt
}

export const money = (v) => {
  const n = intOf(v, -1)
  if (n < 0) throw bad(400, 'Nilai uang tidak valid')
  return n
}

// Nomor order harian: TRX-YYMMDD-0001 (di-transaksi agar aman dari race)
export const nextOrderNumber = () => {
  const t = todayStr()
  const c = db.prepare('SELECT COUNT(*) AS c FROM orders WHERE created_at LIKE ?').get(t + '%').c + 1
  return `TRX-${t.slice(2, 4)}${t.slice(5, 7)}${t.slice(8, 10)}-${String(c).padStart(4, '0')}`
}

export function computeTotals(subtotal, discount, rates) {
  const disc = Math.max(0, Math.min(discount, subtotal))
  const base = subtotal - disc
  const tax_amount = rates.tax_enabled ? Math.round((base * rates.tax_pct) / 100) : 0
  const service_amount = rates.service_enabled ? Math.round((base * rates.service_pct) / 100) : 0
  return { discount: disc, tax_amount, service_amount, total: base + tax_amount + service_amount }
}
