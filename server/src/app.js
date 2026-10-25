// Sedap POS — Express app
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import { nowStr } from './db.js'
import { authRequired } from './auth.js'
import authRoutes from './routes/auth.js'
import catalogRoutes from './routes/catalog.js'
import orderRoutes from './routes/orders.js'
import shiftRoutes from './routes/shifts.js'
import reportRoutes from './routes/reports.js'
import adminRoutes from './routes/admin.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'sedap-pos-api', time: nowStr() }))

// Logo & aset branding — publik (dipakai halaman login sebelum user punya token)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
app.use('/branding', express.static(path.join(__dirname, '..', '.data', 'branding'), { maxAge: '1h' }))
// Foto produk — publik (kartu menu kasir tidak perlu auth untuk memuat gambar)
app.use('/branding/products', express.static(path.join(__dirname, '..', '.data', 'products'), { maxAge: '7d' }))

app.use('/api/auth', authRoutes)
app.use('/api', authRequired)
app.use('/api/catalog', catalogRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/shifts', shiftRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/admin', adminRoutes)

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err.message)
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Terjadi kesalahan pada server' })
})

export default app
