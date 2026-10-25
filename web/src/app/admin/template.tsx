// Transisi masuk halaman admin — remount tiap navigasi (template, bukan layout)
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-pagein">{children}</div>;
}
