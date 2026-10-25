// Sedap POS — helper format
export const rupiah = (n: number | null | undefined) =>
  `Rp ${(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

export const rp = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })

// Input "YYYY-MM-DD HH:MM:SS" (waktu lokal server) → objek Date lokal
export const parseDbTime = (s: string | null | undefined) =>
  s ? new Date(s.replace(' ', 'T')) : new Date(0)

export const timeId = (s: string | null | undefined) =>
  parseDbTime(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

export const dateTimeId = (s: string | null | undefined) =>
  parseDbTime(s).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

export const dateId = (s: string | null | undefined) =>
  parseDbTime(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export const dayLabel = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export const todayInput = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const ORDER_TYPE_LABEL: Record<string, string> = {
  'dine-in': 'Makan di Tempat',
  takeaway: 'Bungkus',
  delivery: 'Delivery',
}

export const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  debit: 'Debit',
  credit: 'Kartu Kredit',
}

export const STATUS_LABEL: Record<string, string> = {
  open: 'Terbuka',
  paid: 'Lunas',
  void: 'Void',
}
