// Sedap POS — seed data demo: users, kategori, menu F&B Indonesia, modifier, meja, settings
import { db, migrate, nowStr } from './db.js'
import { hash } from './auth.js'

migrate()

const seed = db.transaction(() => {
  const nUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c
  if (nUsers > 0) {
    console.log('ℹ️  Database sudah berisi data — seed dilewati. Hapus file .data/pos.db untuk reset.')
    return
  }

  const insUser = db.prepare('INSERT INTO users (name, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
  insUser.run('Admin Sedap', 'admin', hash('admin123'), 'admin', nowStr())
  insUser.run('Iqbal Kasir', 'kasir', hash('kasir123'), 'cashier', nowStr())
  insUser.run('Sinta Kasir', 'sinta', hash('kasir123'), 'cashier', nowStr())

  const insCat = db.prepare('INSERT INTO categories (name, emoji, sort, created_at) VALUES (?, ?, ?, ?)')
  const insProd = db.prepare(`
    INSERT INTO products (category_id, name, description, emoji, price, cost, stock, low_stock_at, is_available, sort, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `)
  const insMod = db.prepare('INSERT INTO modifiers (group_name, name, price) VALUES (?, ?, ?)')
  const insProdMod = db.prepare('INSERT INTO product_modifiers (product_id, modifier_id) VALUES (?, ?)')
  const insTable = db.prepare('INSERT INTO tables (name, capacity, status, created_at) VALUES (?, ?, ?, ?)')
  const insSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')

  // Kategori
  const catId = {}
  for (const [name, emoji] of [
    ['Kopi & Minuman', '☕'], ['Makanan Utama', '🍛'], ['Snack & Gorengan', '🍟'],
    ['Dessert', '🍰'], ['Paket Hemat', '🎁'],
  ]) {
    catId[name] = insCat.run(name, emoji, Object.keys(catId).length, nowStr()).lastInsertRowid
  }

  // Modifier
  const modId = {}
  for (const [group, name, price] of [
    ['Gula', 'Less Sugar', 0], ['Gula', 'Normal Sugar', 0], ['Gula', 'Extra Sugar', 0],
    ['Ukuran', 'Regular', 0], ['Ukuran', 'Large', 5000],
    ['Level Pedas', 'Level 1', 0], ['Level Pedas', 'Level 3', 0], ['Level Pedas', 'Level 5', 0],
    ['Topping', 'Extra Cheese', 6000], ['Topping', 'Extra Telur', 5000], ['Topping', 'Crispy Fried Onion', 3000],
    ['Sambal', 'Sambal Matah', 3000], ['Sambal', 'Sambal Bawang', 2000],
  ]) {
    const key = `${group}:${name}`
    modId[key] = insMod.run(group, name, price).lastInsertRowid
  }

  // Produk [kategori, nama, deskripsi, emoji, harga, hpp, stok, sort, modifiers?]
  const products = [
    [catId['Kopi & Minuman'], 'Kopi Susu Gula Aren', 'Espresso, susu segar, gula aren asli', '🥤', 22000, 8000, 50, 1,
      ['Gula:Less Sugar', 'Gula:Normal Sugar', 'Gula:Extra Sugar', 'Ukuran:Regular', 'Ukuran:Large']],
    [catId['Kopi & Minuman'], 'Americano Dingin', 'Double shot espresso dengan air dan es', '🧊', 18000, 5000, 40, 2,
      ['Ukuran:Regular', 'Ukuran:Large']],
    [catId['Kopi & Minuman'], 'Matcha Latte', 'Matcha premium dengan susu segar', '🍵', 25000, 9000, 30, 3,
      ['Gula:Less Sugar', 'Gula:Normal Sugar', 'Ukuran:Regular', 'Ukuran:Large']],
    [catId['Kopi & Minuman'], 'Teh Tarik', 'Teh susu tarik klasik', '🫖', 15000, 4000, 40, 4],
    [catId['Kopi & Minuman'], 'Jus Alpukat', 'Alpukat segar + susu kental manis', '🥑', 23000, 10000, 25, 5],
    [catId['Kopi & Minuman'], 'Lemon Tea', 'Teh hitam dengan lemon segar', '🍋', 14000, 4000, 35, 6],

    [catId['Makanan Utama'], 'Nasi Goreng Spesial', 'Nasi goreng dengan telur, ayam, dan kerupuk', '🍚', 28000, 12000, 30, 1,
      ['Level Pedas:Level 1', 'Level Pedas:Level 3', 'Level Pedas:Level 5', 'Topping:Extra Telur', 'Topping:Crispy Fried Onion']],
    [catId['Makanan Utama'], 'Ayam Geprek Sambal Bawang', 'Ayam crispy geprek dengan sambal bawang', '🍗', 30000, 14000, 20, 2,
      ['Level Pedas:Level 1', 'Level Pedas:Level 3', 'Level Pedas:Level 5', 'Topping:Extra Cheese']],
    [catId['Makanan Utama'], 'Mie Ayam Bakso', 'Mie ayam dengan bakso sapi dan pangsit', '🍜', 26000, 11000, 25, 3,
      ['Topping:Extra Telur']],
    [catId['Makanan Utama'], 'Sate Ayam (10 tusuk)', 'Sate ayam bumbu kacang + lontong', '🍢', 32000, 15000, 15, 4,
      ['Sambal:Sambal Matah', 'Sambal:Sambal Bawang']],
    [catId['Makanan Utama'], 'Bakso Sapi Jumbo', 'Bakso kuah dengan jumbo ball dan mie', '🍲', 27000, 12000, 20, 5],
    [catId['Makanan Utama'], 'Nasi Padang Komplit', 'Rendang, ayam goreng, daun singkong, sambal ijo', '🍛', 35000, 16000, 15, 6,
      ['Sambal:Sambal Matah']],

    [catId['Snack & Gorengan'], 'Kentang Goreng', 'French fries dengan saus tomat & mayones', '🍟', 17000, 6000, 40, 1,
      ['Topping:Extra Cheese']],
    [catId['Snack & Gorengan'], 'Tahu Crispy', 'Tahu goreng crispy dengan cabai rawit', '🧈', 15000, 5000, 30, 2],
    [catId['Snack & Gorengan'], 'Pisang Goreng Keju (5)', 'Pisang goreng dengan keju parut', '🍌', 18000, 7000, 25, 3],
    [catId['Snack & Gorengan'], 'Risoles Mayo (5 pcs)', 'Risoles isi smoked beef, telur, mayones', '🥟', 16000, 6000, 4, 4],
    [catId['Snack & Gorengan'], 'Cireng Rujak (10 pcs)', 'Cireng bumbu rujak pedas manis', '🥠', 14000, 4000, 20, 5],

    [catId['Dessert'], 'Brownies Fudge', 'Brownies cokelat fudge lembut', '🍫', 21000, 8000, 15, 1],
    [catId['Dessert'], 'Croissant Butter', 'Croissant mentega premium', '🥐', 19000, 7000, 12, 2],
    [catId['Dessert'], 'Cheesecake Blueberry', 'Cheesecake lembut dengan saus blueberry', '🍰', 26000, 11000, 8, 3],
    [catId['Dessert'], 'Pisang Ijo Es', 'Traditional banana ice dessert', '🌴', 22000, 9000, 18, 4],

    [catId['Paket Hemat'], 'Paket Kopi + Nasi Goreng', 'Kopi susu gula aren + nasi goreng spesial', '🎁', 42000, 18000, -1, 1],
    [catId['Paket Hemat'], 'Paket Matcha + Kentang', 'Matcha latte + kentang goreng', '🎁', 36000, 14000, -1, 2],
    [catId['Paket Hemat'], 'Paket Keluarga', '4 minuman + 4 makanan utama pilihan kasir', '👨‍👩‍👧‍👦', 145000, 65000, -1, 3],
  ]

  for (const [cid, name, desc, emoji, price, cost, stock, sort, mods] of products) {
    const pid = insProd.run(cid, name, desc, emoji, price, cost, stock, 5, sort, nowStr()).lastInsertRowid
    for (const mk of mods || []) insProdMod.run(pid, modId[mk])
  }

  for (let i = 1; i <= 8; i++) {
    insTable.run(`Meja ${String(i).padStart(2, '0')}`, i <= 4 ? 2 : 4, 'available', nowStr())
  }

  insSetting.run('store_name', 'Sedap Bistro')
  insSetting.run('receipt_footer', 'Terima kasih! Simpan resi ini sebagai bukti pembayaran.')
  insSetting.run('tax_enabled', '1')
  insSetting.run('tax_pct', '10')
  insSetting.run('service_enabled', '0')
  insSetting.run('service_pct', '5')

  console.log('✅ Seed selesai:')
  console.log('   👤 admin / admin123 (Dashboard Admin — http://localhost:3000/admin)')
  console.log('   👤 kasir / kasir123 (Halaman Kasir — http://localhost:3000/kasir)')
  console.log(`   📦 ${products.length} produk, 5 kategori, 13 modifier, 8 meja`)
})

seed()
