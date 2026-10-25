// Sedap POS — entry point API server
import app from './app.js'
import { migrate } from './db.js'

migrate()

const PORT = Number(process.env.PORT || 4000)
app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Sedap POS API berjalan di http://localhost:${PORT}`)
})
