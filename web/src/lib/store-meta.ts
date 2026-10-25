// Identitas toko untuk metadata server-side (judul tab browser) — fetch dari API
// Dijalankan di proses Next (server), bukan browser — pakai URL internal mesin.
const API = process.env.API_URL_INTERNAL ?? "http://localhost:4000/api";

export async function fetchStoreMeta(): Promise<{ store_name: string; tagline: string }> {
  try {
    const res = await fetch(`${API}/auth/store`, { cache: "no-store" });
    if (res.ok) return (await res.json()) as { store_name: string; tagline: string };
  } catch {
    // API belum siap (mis. saat build) — pakai default
  }
  return { store_name: "Sedap POS", tagline: "Point of Sale F&B" };
}
