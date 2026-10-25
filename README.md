# 🍜 Sedap POS — Point of Sale F&B

POS modern untuk resto/kafe: **Next.js 16 + Express + SQLite (node:sqlite) + Tailwind v4**.
Admin (light) dan Kasir (dark, touch-friendly) dipisah URL: `/admin` dan `/kasir`.

## Menjalankan

```bash
# 1) API (port 4000, DB otomatis dibuat + seed)
cd server && npm install && node src/seed.js && node src/index.js

# 2) Web (otomatis cari port bebas 3000-3005; proxy /api & /branding ke API :4000)
cd web && npm install && npm run dev

# 3) Tes dari HP (satu jaringan Wi-Fi dengan server):
#    buka http://<IP-komputer>:3000  → lihat IP dengan `hostname -I`
```

## Akun seed

| Username | Password  | Role    |
|----------|-----------|---------|
| admin    | admin123  | Admin   |
| kasir    | kasir123  | Kasir   |
| sinta    | kasir123  | Kasir   |

> Ganti password ini sebelum dipakai produksi.

## Fitur

- **Kasir**: buka/tutup shift + rekap selisih kas, dine-in (floor map meja)/takeaway/delivery, parkir order, modifier & catatan dapur, diskon, bayar tunai (hitung kembalian)/QRIS/debit/kredit, struk siap cetak, indikator stok & sold-out, riwayat transaksi pribadi (hanya order yang dia layani, klik untuk lihat struk + cetak ulang).
- **Admin**: dashboard penjualan harian, master data (produk, kategori, modifier, meja, paket bundling), stok + riwayat mutasi, manajemen user + shift, transaksi (void, detail), laporan (rentang tanggal, produk terlaris, breakdown metode bayar) + **Export Excel (.xlsx multi-sheet: ringkasan, transaksi, menu terlaris, harian, per jam — header berwarna, format Rupiah, data-bar, freeze panes)** atau CSV, pengaturan identitas toko (nama, tagline), pajak/servis, footer struk. Nama & tagline toko tampil dinamis di semua halaman (sidebar admin, header kasir, login, judul tab browser, struk, Excel) — berubah realtime setelah disimpan.
- Keamanan: JWT per-login + PIN transaksi (opsional), kasir tidak bisa akses data admin, void transaksi lunas hanya admin.

## Struktur

```
server/          Express API + node:sqlite (tanpa native addon)
  src/routes/    auth, catalog, orders, shifts, reports, admin
  scripts/mint-token.mjs   dev helper: mint JWT tanpa password
web/             Next.js App Router + TypeScript
  src/app/admin  Dashboard admin (light theme)
  src/app/kasir  POS kasir (dark theme)
  src/lib        api client, tipe, format Rupiah/waktu, toast
```
