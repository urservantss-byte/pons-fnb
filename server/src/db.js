// Sedap POS — koneksi SQLite (node:sqlite bawaan Node) + schema + helper waktu
// API kompatibel dengan gaya better-sqlite3: prepare().get/all/run, exec, transaction(fn)
process.env.TZ = process.env.TZ || 'Asia/Jakarta'

import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.POS_DATA_DIR || path.join(__dirname, '..', '.data')
fs.mkdirSync(dataDir, { recursive: true })

export const DB_PATH = process.env.POS_DB || path.join(dataDir, 'pos.db')
const raw = new DatabaseSync(DB_PATH)
raw.exec('PRAGMA journal_mode = WAL')
raw.exec('PRAGMA foreign_keys = ON')

// Wrapper tipis: tambahkan .transaction(fn) ala better-sqlite3
// Method native di-bind ke objek asli agar tak terkena "Illegal invocation"
const bound = new Map()
export const db = new Proxy(raw, {
  get(target, prop) {
    if (prop === 'transaction') {
      return (fn) =>
        (...args) => {
          target.exec('BEGIN')
          try {
            const result = fn(...args)
            target.exec('COMMIT')
            return result
          } catch (err) {
            try { target.exec('ROLLBACK') } catch { /* ignore */ }
            throw err
          }
        }
    }
    if (typeof target[prop] === 'function') {
      if (!bound.has(prop)) bound.set(prop, target[prop].bind(target))
      return bound.get(prop)
    }
    return target[prop]
  },
})

export const p2 = (n) => String(n).padStart(2, '0')

export function nowStr() {
  const d = new Date()
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

export function migrate() {
  raw.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin','cashier')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '🍽️',
      sort INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      emoji TEXT DEFAULT '🍜',
      price INTEGER NOT NULL CHECK (price >= 0),
      cost INTEGER NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT -1,
      low_stock_at INTEGER NOT NULL DEFAULT 5,
      is_available INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS modifiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_modifiers (
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      modifier_id INTEGER NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, modifier_id)
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 2,
      status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','reserved')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      starting_cash INTEGER NOT NULL DEFAULT 0,
      ending_cash INTEGER,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('dine-in','takeaway','delivery')),
      table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
      table_name TEXT,
      shift_id INTEGER REFERENCES shifts(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount INTEGER NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      service_rate REAL NOT NULL DEFAULT 0,
      tax_amount INTEGER NOT NULL DEFAULT 0,
      service_amount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT CHECK (payment_method IN ('cash','qris','debit','credit')),
      paid_amount INTEGER,
      change_amount INTEGER,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','void')),
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      paid_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      modifiers TEXT DEFAULT '[]',
      line_total INTEGER NOT NULL,
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id INTEGER,
      type TEXT NOT NULL CHECK (type IN ('in','out','sale','adjust')),
      qty INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_paid ON orders(paid_at);
    CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
  `)

  // Kolom foto produk (nullable: NULL/'' = tampilkan emoji)
  const hasPhoto = raw.prepare("SELECT COUNT(*) AS c FROM pragma_table_info('products') WHERE name='photo_url'").get()
  if (!hasPhoto.c) raw.exec("ALTER TABLE products ADD COLUMN photo_url TEXT")
}

export function getSettings() {
  const rows = raw.prepare('SELECT key, value FROM settings').all()
  const o = {}
  for (const row of rows) o[row.key] = row.value
  return o
}

export function getRates() {
  const s = getSettings()
  return {
    tax_enabled: s.tax_enabled === '1',
    tax_pct: Number(s.tax_pct || 0),
    service_enabled: s.service_enabled === '1',
    service_pct: Number(s.service_pct || 0),
  }
}
