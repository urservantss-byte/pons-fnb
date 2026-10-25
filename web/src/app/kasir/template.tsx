// Transisi masuk halaman kasir — remount tiap navigasi (template, bukan layout)
// Wrapper wajib flex + min-h-0/min-w-0: tanpa itu wrapper memuai mengikuti isi
// katalog (main flex-1 tak berfungsi di parent block) dan mematahkan rantai
// tinggi — aside keranjang ikut melar 1500px+ dan tombol Bayar tenggelam.
export default function KasirTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-pagein flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>;
}
