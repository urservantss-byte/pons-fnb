// Dev helper: mint JWT untuk user seed TANPA mengekspos password di terminal.
// Pemakaian: node scripts/mint-token.mjs <username>
// Output: JSON { token, user } — hanya untuk testing lokal.
import { db } from '../src/db.js'
import { sign } from '../src/auth.js'

const username = process.argv[2]
if (!username) {
  console.error('Pemakaian: node scripts/mint-token.mjs <username>')
  process.exit(1)
}
const u = db.prepare('SELECT id, name, username, role FROM users WHERE username = ? AND is_active = 1').get(username)
if (!u) {
  console.error(`User "${username}" tidak ditemukan / nonaktif`)
  process.exit(1)
}
console.log(JSON.stringify({ token: sign(u), user: u }))
