# Arsip Prompt Asli — Project POS

> Disimpan: 17 Oktober 2026 · diekstrak verbatim dari riwayat sesi Hermes

---

## Prompt 1 — Versi awal (Nuxt) → project `/home/iqbal/pos-app`

Sesi: 16 Oktober 2026, ± 13:02 (pagi/siang) · @session:default/20261016_125758_4fe446

> **Peran:** Bertindaklah sebagai Full-Stack Web Developer dan UI/UX Expert.
> **Tugas:** Buatkan saya kode dan rancangan lengkap untuk website aplikasi kasir / *Point of Sales* (POS) berbasis web.
> **Konteks Bisnis:** Website ini digunakan untuk kedai makanan yang menjual 3 menu utama: Bakso, Seblak, dan Minuman Teh Poci.
> **Gaya Desain (UI/UX):**
> * **Modern & Bersih:** Gunakan gaya desain modern, minimalis, dan *clean* (seperti gaya desain Apple atau antarmuka *dashboard* modern).
> * **Responsif:** Harus berfungsi sempurna di layar desktop (untuk monitor kasir), tablet, dan *mobile* (untuk kasir keliling).
> * **Palet Warna:** Gunakan warna yang menggugah selera namun profesional (misalnya kombinasi putih bersih, abu-abu muda, dengan aksen merah/oranye hangat untuk makanan, dan hijau/coklat untuk teh). Opsional: Sediakan fitur *Dark Mode*.
> * **Navigasi:** Navigasi sisi (*sidebar*) untuk menu admin, dan area utama (*grid*) yang luas untuk memilih menu saat transaksi.
>
> **Fitur-Fitur yang Harus Ada (Lengkap):**
> 1. **Halaman Kasir (Transaction Desk):**
>    * Tampilan *Grid* dengan foto produk, nama, dan harga.
>    * Kategori filter cepat: "Semua", "Bakso", "Seblak", "Minuman", "Topping/Ekstra".
>    * **Kustomisasi Pesanan (Penting):** Fitur untuk menambahkan catatan khusus pada pesanan (misal: "Seblak Level 5", "Bakso tanpa mie", "Teh Poci gula sedikit").
>    * Keranjang belanja (*Cart*) di sisi kanan yang menampilkan daftar pesanan, subtotal, pajak, dan Total Akhir.
>    * Tombol "Bayar" yang memunculkan *pop-up* pilihan metode pembayaran (Tunai, QRIS, Transfer Bank).
> 2. **Manajemen Produk (Menu Admin):**
>    * Fitur CRUD (Create, Read, Update, Delete) untuk menambah, mengubah harga, dan menghapus menu.
>    * Manajemen stok/ketersediaan (opsi untuk menandai menu "Habis/Sold Out").
> 3. **Manajemen Penjualan & Laporan:**
>    * *Dashboard* utama berisi ringkasan pendapatan hari ini, jumlah pesanan, dan menu paling laris (Best Seller).
>    * Riwayat transaksi lengkap dengan nomor struk.
> 4. **Cetak Struk:**
>    * Simulasi fitur cetak struk (Receipt) ke *thermal printer* (format teks rapi) atau unduh sebagai PDF.
>
> **Instruksi Teknis:**
> * Gunakan Nuxt.js, Express.js (Tailwind direkomendasikan untuk desain modern), dan SQLite.
> * Berikan struktur kode yang modular dan mudah dibaca.
> * Sertakan *mock data* (data palsu) untuk menu Bakso (Bakso Urat, Bakso Halus), Seblak (Seblak Ceker, Seblak Sosis, dengan level pedas 1-5), dan Teh Poci (Original, Lemon, Lychee) agar saya bisa langsung melihat hasilnya.

### Lanjutan (ditempel di pesan yang sama, setelah `---`)

Tolong bagian **Dashboard Utama** dengan menambahkan fitur-fitur berikut:
> 1. **Laporan Penjualan (Harian & Mingguan):** Tambahkan *section* khusus di dashboard yang merangkum data penjualan "Hari Ini" dan "Minggu Ini" (bisa berupa angka ringkasan atau grafik sederhana).
> 2. **Fitur Export to Excel:** Tambahkan tombol "Export Laporan" di area laporan. Buatkan simulasi atau fungsi Nuxt.js-nya (misalnya menggunakan *library* SheetJS / `xlsx`) agar laporan tersebut bisa diunduh menjadi file `.xlsx` dengan format kolom yang rapi dan formal.
> 3. **Notifikasi Stok Menipis:** Buatkan komponen *Alert* (peringatan) visual berwarna kuning/merah di bagian atas dashboard. Notifikasi ini harus muncul otomatis berisi daftar menu (Bakso/Seblak/Minuman) yang stoknya hampir habis (misal: sisa stok < 5 porsi).
> 4. **Tabel 5 Penjualan Terakhir:** Tambahkan tabel *Recent Transactions* di halaman utama dashboard yang menampilkan 5 transaksi terakhir secara *real-time*. Tabel berisi: Waktu, Nomor Struk, Item yang dibeli, dan Total Pembayaran.

Tolong berikan *update* kode untuk **Dashboard** ini lengkap dengan *styling* desain modernnya (Tailwind) dan *mock data* agar saya bisa melihat hasil visual untuk peringatan stok dan tabel penjualannya!

---

## Prompt 2 — Versi final (Next.js) → project `/home/iqbal/pos-fnb` (Sedap POS)

Sesi: 16 Oktober 2026, sore · @session:default/20261016_154912_811360

```
bisa tolong buatkan website point of sales ? aku mau pakai Next.js Express.js Tailwind dan
SQLite tolong research dulu fitur fitur point of sales untuk Food and Beverages, aku maunya
Dashboard admin dan Kasir dipisah halaman/url nya ya pakai design modern dan bagus kamu cari
referensi nya di google
```

Catatan: inilah prompt yang memicu riset fitur POS F&B + inspirasi UI (referensi desain Foodics/Square POS, kasir dark touch-friendly) dan pembangunan aplikasi Sedap POS.
