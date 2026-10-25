// Kasir — POS utama: katalog + keranjang + pembayaran
// Design dark touch-friendly ala Foodics/Square POS
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, assetUrl } from "@/lib/api";
import { rupiah, timeId, ORDER_TYPE_LABEL } from "@/lib/format";
import type { Category, Meta, Order, OrderItem, Product, Shift, Table } from "@/lib/types";
import Modal from "@/components/Modal";
import Receipt from "@/components/Receipt";
import { useToast } from "@/lib/toast";
import { CircleCheck, Search, Sparkles, Utensils, ShoppingBag, Bike, Armchair, ShoppingBasket, TriangleAlert, X, Trash2, Banknote, Smartphone, CreditCard, Landmark, Printer, ReceiptText, Clock, Plus, Minus, PencilLine } from "lucide-react";

type OrderType = "dine-in" | "takeaway" | "delivery";

// order_items.modifiers tersimpan sebagai string JSON ("[]" = tanpa modifier)
function itemHasModifiers(m: string): boolean {
  try {
    return JSON.parse(m || "[]").length > 0;
  } catch {
    return true;
  }
}

// Input Rupiah: strip non-digit lalu format titik ribuan
const digits = (s: string) => s.replace(/\D/g, "");
const formatRp = (s: string) => (s ? Number(s).toLocaleString("id-ID") : "");

// ====== Komponen kecil ======

function QtyButton({
  qty,
  onMinus,
  onPlus,
  dark = true,
}: {
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
  dark?: boolean;
}) {
  const base = dark
    ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100";
  return (
    <div className={`flex items-center gap-1.5 rounded-xl border p-1 ${dark ? "border-zinc-700 bg-zinc-800/60" : "border-slate-200 bg-slate-50"}`}>
      <button onClick={onMinus} className={`flex size-7 items-center justify-center rounded-lg text-lg font-black transition ${base}`}>
        −
      </button>
      <span className={`min-w-6 text-center text-sm font-black ${dark ? "text-white" : "text-slate-900"}`}>{qty}</span>
      <button onClick={onPlus} className={`flex size-7 items-center justify-center rounded-lg text-lg font-black transition ${base}`}>
        +
      </button>
    </div>
  );
}

// ====== Halaman ======

export default function CashierPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [pinnedOrders, setPinnedOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<number | "all">("all");

  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingCart, setLoadingCart] = useState(false);

  const [modTarget, setModTarget] = useState<Product | null>(null);
  const [modSel, setModSel] = useState<number[]>([]);
  const [modQty, setModQty] = useState(1);
  const [itemNote, setItemNote] = useState("");

  const [tableModal, setTableModal] = useState(false);
  const [tableModalMode, setTableModalMode] = useState<"new" | "existing">("new");
  // Panel keranjang di mobile (lg ke atas selalu tampil sebagai kolom)
  const [cartOpen, setCartOpen] = useState(false);
  // Mobile (lg ke bawah): fitur meja disembunyikan — mulai dari Bungkus
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches && !order) {
      setOrderType("takeaway");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Item yang diklik sebelum meja dipilih — otomatis masuk keranjang setelah meja dipilih
  const [pendingItem, setPendingItem] = useState<{ productId: number; qty: number; modifierIds: number[]; notes: string } | null>(null);
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [discount, setDiscount] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [receipt, setReceipt] = useState<Order | null>(null);
  const [payModal, setPayModal] = useState(false);

  // Shift kasir — wajib ada sebelum transaksi (mutasi kas dicatat per shift)
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftModal, setShiftModal] = useState(false);
  const [startingCash, setStartingCash] = useState("100000");
  const [endingCash, setEndingCash] = useState("");
  const [closeResult, setCloseResult] = useState<(Shift & { cash_difference: number }) | null>(null);

  const toast = useToast();

  // ====== Load data ======
  const loadCatalog = useCallback(async () => {
    try {
      const [m, c, p, t] = await Promise.all([
        api.get<Meta>("/catalog/meta"),
        api.get<Category[]>("/catalog/categories"),
        api.get<Product[]>("/catalog/products"),
        api.get<Table[]>("/catalog/tables"),
      ]);
      setMeta(m);
      setCategories(c);
      setProducts(p);
      setTables(t);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat katalog", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPinned = useCallback(async () => {
    try {
      setPinnedOrders(await api.get<Order[]>("/orders?status=open"));
    } catch {
      /* diam */
    }
  }, []);

  // ===== Riwayat transaksi kasir ini =====
  const [histOpen, setHistOpen] = useState(false);
  const [hist, setHist] = useState<Order[] | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [histDetail, setHistDetail] = useState<Order | null>(null);

  const openHistory = useCallback(async () => {
    setHistOpen(true);
    setHistLoading(true);
    try {
      setHist(await api.get<Order[]>("/orders?mine=1&limit=100"));
    } catch {
      setHist([]);
    } finally {
      setHistLoading(false);
    }
  }, []);

  async function openHistDetail(o: Order) {
    try {
      setHistDetail(await api.get<Order>(`/orders/${o.id}`));
    } catch {
      /* diam */
    }
  }


  // Shift aktif kasir ini
  const loadShift = useCallback(async () => {
    try {
      setShift(await api.get<Shift | null>("/shifts/current"));
    } catch {
      /* diam */
    }
  }, []);

  async function openShift() {
    try {
      const s = await api.post<Shift>("/shifts/open", { starting_cash: Number(startingCash) || 0 });
      setShift(s);
      setShiftModal(false);
      toast(`Shift dibuka — kas awal ${rupiah(s.starting_cash)}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal membuka shift", "error");
    }
  }

  async function closeShift() {
    if (!shift) return;
    try {
      const result = await api.post<Shift & { cash_difference: number }>(`/shifts/${shift.id}/close`, {
        ending_cash: Number(endingCash) || 0,
      });
      setCloseResult(result);
      setShift(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menutup shift", "error");
    }
  }

  useEffect(() => {
    loadCatalog();
    loadPinned();
    loadShift();
  }, [loadCatalog, loadPinned, loadShift]);

  // Estimasi total tampilan (pajak/servis dari settings)
  const estTotal = useMemo(() => {
    if (!order) return 0;
    const disc = Math.min(Number(digits(discount)) || 0, order.subtotal);
    const base = order.subtotal - disc;
    const tax = meta?.rates.tax_enabled ? Math.round((base * meta.rates.tax_pct) / 100) : 0;
    const svc = meta?.rates.service_enabled ? Math.round((base * meta.rates.service_pct) / 100) : 0;
    return base + tax + svc;
  }, [order, discount, meta]);

  const changeAmount = useMemo(() => {
    const given = Number(digits(cashGiven)) || 0;
    return Math.max(given - estTotal, 0);
  }, [cashGiven, estTotal]);

  // ====== Aksi order ======

  async function startOrder(type: OrderType, tableId?: number) {
    if (loadingCart) return;
    setLoadingCart(true);
    try {
      const body: Record<string, unknown> = { type };
      if (type === "dine-in") body.table_id = tableId;
      else {
        // Bungkus/Delivery: ikutkan data pelanggan bila sudah diisi
        if (customerName.trim()) body.customer_name = customerName.trim();
        if (customerPhone.trim()) body.customer_phone = customerPhone.trim();
      }
      const o = await api.post<Order>("/orders", body);
      setOrder(o);
      setOrderType(type);
      setDiscount("");
      return o;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal membuat pesanan", "error");
      return null;
    } finally {
      setLoadingCart(false);
    }
  }

  // Setelah meja dipilih, masukkan item yang menunggu (klik produk sebelum pilih meja)
  async function flushPendingItem(orderId: number) {
    const pending = pendingItem;
    if (!pending) return;
    setPendingItem(null);
    await pushItem(orderId, pending.productId, pending.qty, pending.modifierIds, pending.notes);
  }

  async function changeType(newType: OrderType) {
    // Draft tanpa item → buat ulang; draft berisi item → wajib void dulu (meja terkait)
    if (order && order.items && order.items.length > 0) {
      toast("Kosongkan keranjang atau void pesanan dulu sebelum ganti tipe", "error");
      return;
    }
    if (order) {
      await api.post(`/orders/${order.id}/void`).catch(() => {});
      setOrder(null);
      await loadPinned();
    }
    setOrderType(newType);
    if (newType === "dine-in") {
      setTableModalMode("new");
      setTableModal(true);
    } else {
      await startOrder(newType);
    }
  }

  async function addToCart(p: Product) {
    if (p.is_available === 0) {
      toast(`${p.name} sedang habis`, "error");
      return;
    }
    // Toggle: produk tanpa catatan sudah ada di keranjang → hapus line-nya
    // (line ber-catatan tidak dihitung agar catatan pesanan tidak hilang)
    if (order) {
      const existing = (order.items ?? []).find(
        (it) => it.product_id === p.id && !it.notes && !itemHasModifiers(it.modifiers)
      );
      if (existing) {
        await removeItem(existing);
        return;
      }
    }
    if (p.modifiers && p.modifiers.length > 0) {
      setModTarget(p);
      setModSel([]);
      setModQty(1);
      setItemNote("");
      return;
    }
    await addItem(p.id, 1);
  }

  // Modal catatan untuk produk tanpa modifier (langsung tambah qty 1)
  function openNoteModal(p: Product) {
    setModTarget(p);
    setModSel([]);
    setModQty(1);
    setItemNote("");
  }

  async function addItem(productId: number, qty: number, modifierIds: number[] = [], notes = "") {
    if (!order) {
      if (orderType === "dine-in") {
        // Belum ada pesanan & belum pilih meja: simpan item, minta meja dulu
        setPendingItem({ productId, qty, modifierIds, notes });
        setTableModalMode("new");
        setTableModal(true);
        return;
      }
      const o = await startOrder(orderType);
      if (!o) return;
      await pushItem(o.id, productId, qty, modifierIds, notes);
      return;
    }
    await pushItem(order.id, productId, qty, modifierIds, notes);
  }

  async function pushItem(orderId: number, productId: number, qty: number, modifierIds: number[], notes: string) {
    setLoadingCart(true);
    try {
      const o = await api.post<Order>(`/orders/${orderId}/items`, {
        product_id: productId,
        qty,
        modifier_ids: modifierIds,
        notes,
      });
      setOrder(o);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menambah item", "error");
    } finally {
      setLoadingCart(false);
    }
  }

  async function changeQty(item: OrderItem, qty: number) {
    if (!order) return;
    if (qty < 1) {
      await removeItem(item);
      return;
    }
    setLoadingCart(true);
    try {
      setOrder(await api.patch<Order>(`/orders/${order.id}/items/${item.id}`, { qty }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengubah jumlah", "error");
    } finally {
      setLoadingCart(false);
    }
  }

  async function removeItem(item: OrderItem) {
    if (!order) return;
    setLoadingCart(true);
    try {
      setOrder(await api.del<Order>(`/orders/${order.id}/items/${item.id}`));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus item", "error");
    } finally {
      setLoadingCart(false);
    }
  }

  async function applyDiscount() {
    if (!order) return;
    try {
      setOrder(await api.patch<Order>(`/orders/${order.id}`, { discount: Number(digits(discount)) || 0 }));
      toast("Diskon diterapkan");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Diskon gagal", "error");
    }
  }

  async function voidOrder() {
    if (!order) return;
    if (!confirm(`Batalkan pesanan ${order.order_number}?`)) return;
    try {
      await api.post(`/orders/${order.id}/void`);
      toast("Pesanan dibatalkan");
      setOrder(null);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount("");
      loadPinned();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal membatalkan", "error");
    }
  }

  async function openOrder(o: Order) {
    try {
      const full = await api.get<Order>(`/orders/${o.id}`);
      setOrder(full);
      setOrderType(full.type);
      setDiscount(full.discount ? String(full.discount) : "");
      setTableModal(false);
      toast(`Melanjutkan ${full.order_number}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal membuka pesanan", "error");
    }
  }

  async function onPay() {
    if (!order || !order.items?.length) return;
    try {
      const body: Record<string, unknown> = {
        payment_method: payMethod,
        discount: Number(digits(discount)) || 0,
      };
      if (payMethod === "cash") {
        const given = Number(digits(cashGiven)) || estTotal;
        body.paid_amount = given;
      }
      // Data pelanggan (delivery/bungkus) dikirim saat lunas — sumber paling akurat
      if (customerName.trim()) body.customer_name = customerName.trim();
      if (customerPhone.trim()) body.customer_phone = customerPhone.trim();
      const paid = await api.post<Order>(`/orders/${order.id}/pay`, body);
      setReceipt(paid);
      setPayModal(false);
      setOrder(null);
      setDiscount("");
      setCashGiven("");
      setCustomerName("");
      setCustomerPhone("");
      loadCatalog(); // refresh stok
      loadPinned();
      toast(`${paid.order_number} lunas — kembalian ${rupiah(paid.change_amount ?? 0)}`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Pembayaran gagal", "error");
    }
  }

  // ====== Filter produk ======
  const visibleProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      if (activeCat !== "all" && p.category_id !== activeCat) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, activeCat]);

  const cartCount = order?.items?.length ?? 0;
  const availableTables = tables.filter((t) => t.status === "available");

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden">
      {/* ===== KOLOM KIRI: katalog ===== */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Bar mobile: buka/tutup panel keranjang (hilang di lg ke atas) */}
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800/80 px-4 py-2.5 lg:hidden">
          <button
            onClick={() => setCartOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-zinc-950 shadow-lg shadow-amber-500/25 transition active:scale-95"
          >
            {cartOpen ? <Minus className="size-4" /> : <ShoppingBasket className="size-4" />}
            {cartOpen ? "Tutup Keranjang" : "Keranjang"}
          </button>
          {cartCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-300">
              {cartCount} item · {rupiah(estTotal)}
            </span>
          )}
          <span className="ml-auto truncate text-[11px] font-semibold text-zinc-500">
            {order ? order.order_number : "Belum ada pesanan"}
          </span>
        </div>

        {/* Bar kategori + search */}
        <div className="flex shrink-0 flex-col gap-2 border-b border-zinc-800/80 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
          <input
            className="input-dark w-full sm:max-w-xs"
            placeholder="Cari menu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveCat("all")}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                activeCat === "all"
                  ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25"
                  : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <Sparkles className="mr-1.5 inline size-4" />
              Semua
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  activeCat === c.id
                    ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25"
                    : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid produk */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {visibleProducts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Search className="size-10 text-zinc-600" />
              <p className="font-bold text-zinc-300">Menu tidak ditemukan</p>
              <p className="text-sm text-zinc-500">Coba kata kunci atau kategori lain</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-28 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visibleProducts.map((p) => {
                const soldOut = p.is_available === 0;
                const outOfStock = p.stock === 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={soldOut || outOfStock}
                    className={`group relative flex flex-col rounded-2xl border p-4 text-left transition active:scale-[0.97] ${
                      soldOut || outOfStock
                        ? "cursor-not-allowed border-zinc-800 bg-zinc-900/40 opacity-50"
                        : "border-zinc-800 bg-zinc-900/70 hover:border-amber-500/50 hover:bg-zinc-900"
                    } ${loadingCart ? "pointer-events-none" : ""}`}
                  >
                    {(soldOut || outOfStock) && (
                      <span className="absolute right-3 top-3 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-red-400">
                        {soldOut ? "Habis" : "Stok 0"}
                      </span>
                    )}
                    {!soldOut && !outOfStock && p.stock >= 0 && p.stock <= p.low_stock_at && (
                      <span className="absolute right-3 top-3 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300">
                        sisa {p.stock}
                      </span>
                    )}
                    <span className="mb-3 flex size-12 items-center justify-center overflow-hidden rounded-xl bg-zinc-800 text-2xl">
                      {p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={assetUrl(p.photo_url) ?? undefined} alt={p.name} className="size-full object-cover" />
                      ) : (
                        p.emoji
                      )}
                    </span>
                    <p className="text-sm font-bold leading-snug text-zinc-100">{p.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{p.description}</p>
                    <p className="mt-auto pt-2 text-base font-black text-amber-400">{rupiah(p.price)}</p>
                    {/* Tombol catatan: hanya untuk produk tanpa modifier (yang bermodifier sudah punya kolom catatan di modalnya) */}
                    {!(p.modifiers && p.modifiers.length > 0) && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Tambah catatan ${p.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (soldOut || outOfStock || loadingCart) return;
                          openNoteModal(p);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (soldOut || outOfStock || loadingCart) return;
                            openNoteModal(p);
                          }
                        }}
                        className={`absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 transition hover:border-amber-500/60 hover:text-amber-300 ${
                          soldOut || outOfStock ? "opacity-40" : ""
                        }`}
                      >
                        <PencilLine className="size-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Baris pesanan diparkir */}
        {pinnedOrders.length > 0 && (
          <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-900/40 px-5 py-3">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              <span className="shrink-0 text-[11px] font-bold uppercase text-zinc-500">Parkir:</span>
              {pinnedOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openOrder(o)}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-amber-500/50"
                >
                  {o.type === "dine-in" ? <Utensils className="inline size-3.5" /> : o.type === "takeaway" ? <ShoppingBag className="inline size-3.5" /> : <Bike className="inline size-3.5" />}
                  <span className="font-mono">{o.table_name || o.order_number.slice(-4)}</span>
                  <span className="text-amber-400">{rupiah(o.total || o.subtotal)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===== Panel Riwayat Transaksi ===== */}
      <Modal open={histOpen} onClose={() => { setHistOpen(false); setHistDetail(null); }} title="Riwayat Transaksi Saya" size="lg">
        {histDetail ? (
          <div>
            <button
              onClick={() => setHistDetail(null)}
              className="mb-4 flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
            >
              ← Kembali ke daftar
            </button>
            <div className="mx-auto max-w-xs rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {meta && <Receipt order={histDetail} meta={meta} />}
            </div>
            <div className="mt-4 flex justify-center">
              <button onClick={() => window.print()} className="btn-ghost flex items-center gap-2">
                <Printer className="size-4" /> Cetak Struk
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-slate-500">
              Hanya transaksi yang kamu layani yang tampil di sini.
            </p>
            {histLoading ? (
              <div className="py-10 text-center text-sm font-semibold text-slate-400">Memuat…</div>
            ) : !hist || hist.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <ReceiptText className="size-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-500">Belum ada transaksi.</p>
                <p className="text-xs text-slate-400">Transaksi yang kamu selesaikan akan muncul di sini.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {hist.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => openHistDetail(o)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-amber-400 hover:bg-amber-50/40"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      {o.type === "dine-in" ? <Utensils className="size-4" /> : o.type === "takeaway" ? <ShoppingBag className="size-4" /> : <Bike className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-800">{o.order_number}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {o.status === "paid" ? "LUNAS" : "TERBUKA"}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Clock className="size-3" /> {timeId(o.created_at)} · {ORDER_TYPE_LABEL[o.type]}
                        {o.table_name ? ` · ${o.table_name}` : ""} · {o.item_count ?? 0} item
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black text-slate-800">{rupiah(o.total ?? o.subtotal)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ===== KOLOM KANAN: keranjang (drawer di mobile) ===== */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-[90] bg-zinc-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setCartOpen(false)}
        />
      )}
      <aside
        className={`shrink-0 flex-col border-l border-zinc-800/80 ${
          cartOpen
            ? "fixed inset-y-0 right-0 z-[95] flex w-[min(26rem,92vw)] bg-zinc-900 shadow-2xl lg:static lg:z-auto lg:w-[26rem] lg:bg-zinc-900/50 lg:shadow-none"
            : "hidden bg-zinc-900/50 lg:flex lg:w-[26rem]"
        }`}
      >
        {/* Pilih tipe */}
        <div className="shrink-0 border-b border-zinc-800/80 p-4">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {(
              [
                { v: "dine-in", icon: Utensils, label: "Dine-in" },
                { v: "takeaway", icon: ShoppingBag, label: "Bungkus" },
                { v: "delivery", icon: Bike, label: "Delivery" },
              ] as const
            ).map((t) => (
              <button
                key={t.v}
                onClick={() => changeType(t.v)}
                className={`${t.v === "dine-in" ? "hidden lg:flex" : "flex"} flex-col items-center gap-1 rounded-xl py-3 text-sm font-bold transition ${
                  orderType === t.v
                    ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25"
                    : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <t.icon className="size-5" />
                {t.label}
              </button>
            ))}
          </div>
          {orderType === "dine-in" && (
            <button
              onClick={() => {
                setTableModalMode("existing");
                setTableModal(true);
              }}
              className="mt-3 hidden w-full items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800/40 px-4 py-2.5 text-sm font-bold transition hover:border-amber-500/50 lg:flex"
            >
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Armchair className="size-3.5" />
                {order?.table_name || "Pilih meja"}
              </span>
              <span className="text-amber-400">Ubah ›</span>
            </button>
          )}
          {(orderType === "delivery" || (orderType === "takeaway" && order)) && (
            <div className="mt-3 flex gap-2">
              <input
                className="input-dark"
                placeholder="Nama pelanggan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              {orderType === "delivery" && (
                <input
                  className="input-dark"
                  placeholder="No. WA"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        {/* Daftar item */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!order || !order.items || order.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBasket className="size-10 text-zinc-700" />
              <p className="text-sm font-bold text-zinc-400">Keranjang kosong</p>
              <p className="text-xs text-zinc-600">Klik menu di kiri untuk mulai</p>
              <button
                onClick={openHistory}
                className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-amber-500/50 hover:text-amber-400"
              >
                <ReceiptText className="size-4" /> Lihat Riwayat Transaksi
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {order.items.map((it) => {
                let mods: { id: number; name: string; price: number }[] = [];
                try {
                  mods = JSON.parse(it.modifiers || "[]");
                } catch {
                  /* ignore */
                }
                return (
                  <div key={it.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-100">{it.name}</p>
                        {mods.length > 0 && (
                          <p className="mt-0.5 text-[11px] font-medium text-amber-300/80">
                            + {mods.map((m) => m.name).join(", ")}
                          </p>
                        )}
                        {it.notes && <p className="mt-0.5 text-[11px] italic text-zinc-500">“{it.notes}”</p>}
                        <p className="mt-1 text-xs font-semibold text-zinc-500">{rupiah(it.unit_price)} / pcs</p>
                      </div>
                      <button
                        onClick={() => removeItem(it)}
                        className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <QtyButton
                        qty={it.qty}
                        onMinus={() => changeQty(it, it.qty - 1)}
                        onPlus={() => changeQty(it, it.qty + 1)}
                      />
                      <p className="text-sm font-black text-amber-400">{rupiah(it.line_total)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ringkasan + aksi */}
        <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-900/80 p-4">
          {/* Status shift */}
          <div className="mb-3 flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800/50 px-3.5 py-2.5">
            <div className="min-w-0">
              {shift ? (
                <>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                    <Clock className="size-3.5 text-amber-400" /> Shift aktif sejak {timeId(shift.started_at)}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    Kas {rupiah(shift.expected_cash ?? shift.starting_cash)} · {shift.orders_count ?? 0} trx · {rupiah(shift.revenue_total ?? 0)}
                  </p>
                </>
              ) : (
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-400"><TriangleAlert className="size-3.5" /> Shift belum dibuka</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={openHistory}
                title="Riwayat Transaksi Saya"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-700/60 px-3 py-1.5 text-xs font-bold text-zinc-200 transition hover:bg-zinc-700"
              >
                <ReceiptText className="size-3.5" /> Riwayat
              </button>
              <button
                onClick={() => {
                  if (shift) {
                    setEndingCash("");
                    setCloseResult(null);
                  }
                  setShiftModal(true);
                }}
                className="rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-black text-zinc-950 transition hover:bg-amber-400"
              >
                {shift ? "Tutup" : "Buka"}
              </button>
            </div>
          </div>

          {/* Diskon */}
          <div className="mb-3 flex gap-2">
            <input
              className="input-dark"
              type="text"
              inputMode="numeric"
              placeholder="Diskon Rp"
              value={formatRp(digits(discount))}
              onChange={(e) => setDiscount(digits(e.target.value))}
              onBlur={applyDiscount}
            />
            <button onClick={applyDiscount} className="btn-ghost-dark shrink-0 px-3">
              Terapkan
            </button>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-200">{rupiah(order?.subtotal ?? 0)}</span>
            </div>
            {Number(digits(discount)) > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Diskon</span>
                <span className="text-red-400">-{rupiah(Math.min(Number(digits(discount)), order?.subtotal ?? 0))}</span>
              </div>
            )}
            {meta?.rates.tax_enabled && (
              <div className="flex justify-between text-zinc-400">
                <span>Pajak {meta.rates.tax_pct}%</span>
                <span className="font-semibold text-zinc-200">
                  {rupiah(Math.round(((order?.subtotal ?? 0) - Math.min(Number(discount), order?.subtotal ?? 0)) * meta.rates.tax_pct) / 100)}
                </span>
              </div>
            )}
            {meta?.rates.service_enabled && (
              <div className="flex justify-between text-zinc-400">
                <span>Servis {meta.rates.service_pct}%</span>
                <span className="font-semibold text-zinc-200">
                  {rupiah(Math.round(((order?.subtotal ?? 0) - Math.min(Number(discount), order?.subtotal ?? 0)) * meta.rates.service_pct) / 100)}
                </span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-zinc-800 pt-3">
              <span className="text-base font-black text-zinc-200">Total</span>
              <span className="text-2xl font-black tracking-tight text-amber-400">{rupiah(estTotal)}</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={voidOrder}
              disabled={!order}
              className="btn-ghost-dark w-20 shrink-0 px-0"
              title="Void pesanan"
            >
              <Trash2 className="size-4" />
            </button>
            <button
              onClick={() => {
                setCashGiven("");
                // Simpan dulu data pelanggan yang sudah diisi di panel, biar tidak hilang
                if (order && (customerName.trim() || customerPhone.trim())) {
                  api
                    .patch(`/orders/${order.id}`, {
                      customer_name: customerName.trim(),
                      customer_phone: customerPhone.trim(),
                    })
                    .catch(() => {});
                }
                setPayModal(true);
              }}
              disabled={!order || !order.items?.length}
              className="btn-primary flex-1 py-4 text-base"
            >
              Bayar · {rupiah(estTotal)}
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MODAL: modifier produk ===== */}
      <Modal open={!!modTarget} onClose={() => setModTarget(null)} title={`${modTarget?.emoji ?? ""} ${modTarget?.name ?? ""}`}>
        {modTarget && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-slate-500">
              Harga dasar <span className="font-bold text-slate-800">{rupiah(modTarget.price)}</span>
            </p>

            {/* Group modifier */}
            {Object.entries(
              (modTarget.modifiers || []).reduce<Record<string, typeof modTarget.modifiers>>((acc, m) => {
                (acc[m.group_name] ||= []).push(m);
                return acc;
              }, {})
            ).map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{group}</p>
                <div className="grid grid-cols-2 gap-2">
                  {items!.map((m) => {
                    const selected = modSel.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setModSel((prev) => (prev.includes(m.id) ? prev.filter((i) => i !== m.id) : [...prev, m.id]))}
                        className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-bold transition ${
                          selected ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className="text-xs">{m.price ? `+${rupiah(m.price)}` : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Jumlah</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModQty(Math.max(1, modQty - 1))}
                  className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-700"
                >
                  −
                </button>
                <span className="min-w-10 text-center text-xl font-black text-slate-900">{modQty}</span>
                <button
                  onClick={() => setModQty(modQty + 1)}
                  className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-700"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Catatan untuk dapur</p>
              <input
                className="input"
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="cth: tanpa bawang, sambal terpisah"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400">Estimasi total</span>
                <span className="text-lg font-black text-amber-600">
                  {rupiah(
                    (modTarget.price + (modTarget.modifiers || []).filter((m) => modSel.includes(m.id)).reduce((s, m) => s + m.price, 0)) * modQty
                  )}
                </span>
              </div>
              <button
                className="btn-primary px-6 py-3"
                onClick={async () => {
                  await addItem(modTarget.id, modQty, modSel, itemNote);
                  setModTarget(null);
                }}
              >
                + Tambah ke Keranjang
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== MODAL: pilih meja ===== */}
      <Modal
        open={tableModal}
        onClose={() => setTableModal(false)}
        title={tableModalMode === "new" ? "Pilih Meja" : "Meja & Pesanan Terbuka"}
        size="lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            {(["available", "occupied", "reserved"] as const).map((s) => {
              const count = tables.filter((t) => t.status === s).length;
              return (
                <span
                  key={s}
                  className={`badge ${
                    s === "available" ? "bg-emerald-50 text-emerald-600" : s === "occupied" ? "bg-amber-50 text-amber-600" : "bg-violet-50 text-violet-600"
                  }`}
                >
                  {s === "available" ? "Kosong" : s === "occupied" ? "Terisi" : "Reservasi"}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {tableModalMode === "existing" && pinnedOrders.length > 0 && (
          <div className="mb-5">
            <p className="label">Lanjutkan pesanan diparkir</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {pinnedOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openOrder(o)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-amber-400"
                >
                  <p className="font-mono text-xs font-bold text-slate-800">{o.order_number}</p>
                  <p className="text-[11px] text-slate-500">
                    {o.type === "dine-in" ? "Makan di tempat" : o.type === "takeaway" ? "Bungkus" : "Antar"} · {o.table_name || o.customer_name || "—"} · {rupiah(o.subtotal)}
                  </p>
                </button>
              ))}
            </div>
            <div className="my-4 border-t border-dashed border-slate-200" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {tables.map((t) => {
            const disabled = t.status !== "available";
            const isCurrent = order?.table_id === t.id;
            return (
              <button
                key={t.id}
                disabled={disabled && !isCurrent}
                onClick={async () => {
                  if (order) {
                    // Pindah meja di tengah order = void + buat baru
                    if (!confirm(`Pindah pesanan ke ${t.name}? Item saat ini akan dihapus.`)) return;
                    await api.post(`/orders/${order.id}/void`).catch(() => {});
                    await startOrder("dine-in", t.id);
                    loadPinned();
                    setTableModal(false);
                  } else {
                    const o = await startOrder("dine-in", t.id);
                    setTableModal(false);
                    if (o) await flushPendingItem(o.id);
                  }
                }}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-4 transition ${
                  isCurrent
                    ? "border-amber-400 bg-amber-50"
                    : disabled
                      ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50"
                      : "border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50"
                }`}
              >
                <Armchair className="size-6 text-slate-400" />
                <span className="text-sm font-bold text-slate-800">{t.name}</span>
                <span
                  className={`text-[10px] font-black uppercase ${
                    t.status === "available" ? "text-emerald-500" : t.status === "occupied" ? "text-amber-500" : "text-violet-500"
                  }`}
                >
                  {t.status === "available" ? "Kosong" : t.status === "occupied" ? "Terisi" : "Reservasi"}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* ===== MODAL: pembayaran ===== */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title={`Pembayaran ${order?.order_number ?? ""}`}>
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Total Tagihan</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-amber-400">{rupiah(estTotal)}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {cartCount} item · {ORDER_TYPE_LABEL[orderType]}
              {order?.table_name ? ` · ${order.table_name}` : ""}
            </p>
          </div>

          <div>
            <p className="label">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "cash", icon: Banknote, label: "Tunai" },
                { v: "qris", icon: Smartphone, label: "QRIS" },
                { v: "debit", icon: CreditCard, label: "Kartu Debit" },
                { v: "credit", icon: Landmark, label: "Kartu Kredit" },
              ].map((m) => (
                <button
                  key={m.v}
                  onClick={() => setPayMethod(m.v)}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-sm font-bold transition ${
                    payMethod === m.v ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <m.icon className="size-5" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {payMethod === "cash" && (
            <div>
              <p className="label">Uang Diterima</p>
              <input
                type="text"
                inputMode="numeric"
                className="input text-lg font-black"
                placeholder={estTotal ? rupiah(estTotal) : "0"}
                value={formatRp(digits(cashGiven))}
                onChange={(e) => setCashGiven(digits(e.target.value))}
                autoFocus
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {[estTotal, 50000, 100000, 150000, 200000].map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setCashGiven(formatRp(String(v)))}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    {i === 0 ? "Uang Pas" : rupiah(v)}
                  </button>
                ))}
              </div>
              {Number(digits(cashGiven)) >= estTotal && (
                <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  Kembalian: {rupiah(changeAmount)}
                </p>
              )}
              {digits(cashGiven) !== "" && Number(digits(cashGiven)) < estTotal && (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  Kurang {rupiah(estTotal - (Number(digits(cashGiven)) || 0))} dari total
                </p>
              )}
            </div>
          )}

          {payMethod === "qris" && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-6">
              <div className="flex size-36 items-center justify-center rounded-xl bg-slate-100">
                <Smartphone className="size-14 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">Minta pelanggan scan QRIS</p>
              <p className="text-xs text-slate-400">Tandai lunas setelah notifikasi pembayaran masuk</p>
            </div>
          )}

          {(orderType === "delivery" || customerName) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label">Nama Pelanggan</p>
                <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              {orderType === "delivery" && (
                <div>
                  <p className="label">No. Telepon</p>
                  <input className="input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button onClick={() => setPayModal(false)} className="btn-ghost">
              Batal
            </button>
            <button onClick={onPay} className="btn-primary px-8 py-3">
              <span className="flex items-center justify-center gap-2"><CircleCheck className="size-4" /> Selesaikan Pembayaran</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== MODAL: struk ===== */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Transaksi Berhasil" size="sm">
        {receipt && meta && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-50 px-6 py-4 text-center">
              <p className="text-2xl font-black text-emerald-700">{rupiah(receipt.total)}</p>
              <p className="text-xs font-bold text-emerald-600">
                {receipt.payment_method === "cash" && `Kembalian ${rupiah(receipt.change_amount ?? 0)}`}
                {receipt.payment_method !== "cash" && "Lunas"}
              </p>
              <p className="font-mono text-[11px] text-emerald-500">{receipt.order_number}</p>
            </div>
            <Receipt order={receipt} meta={meta} />
            <div className="flex w-full gap-2">
              <button onClick={() => window.print()} className="btn-ghost flex-1">
                <span className="flex items-center justify-center gap-2"><Printer className="size-4" /> Cetak</span>
              </button>
              <button onClick={() => setReceipt(null)} className="btn-primary flex-1">
                Selesai
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* ===== MODAL: shift ===== */}
      <Modal open={shiftModal} onClose={() => setShiftModal(false)} title={shift ? "Tutup Shift" : "Buka Shift"}>
        {closeResult ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-emerald-50 p-5 text-center">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><CircleCheck className="size-4" /> Shift Ditutup</p>
              <p className="mt-1 text-xs text-emerald-600">{timeId(closeResult.started_at)} → {timeId(closeResult.ended_at)}</p>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Kas awal", closeResult.starting_cash],
                ["Penjualan tunai", closeResult.cash_total ?? 0],
                ["QRIS + Kartu", (closeResult.qris_total ?? 0) + (closeResult.debit_total ?? 0) + (closeResult.credit_total ?? 0)],
                ["Kas seharusnya", closeResult.expected_cash ?? 0],
                ["Kas dihitung", closeResult.ending_cash ?? 0],
              ].map(([label, v]) => (
                <div key={String(label)} className="flex justify-between text-slate-600">
                  <span>{label}</span>
                  <span className="font-bold">{rupiah(Number(v))}</span>
                </div>
              ))}
              <div
                className={`mt-2 flex justify-between rounded-xl px-4 py-3 text-base font-black ${
                  Math.abs(closeResult.cash_difference) < 1
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                <span>Selisih kas</span>
                <span>{rupiah(closeResult.cash_difference)}</span>
              </div>
            </div>
            <button onClick={() => setCloseResult(null)} className="btn-primary w-full">
              Selesai
            </button>
          </div>
        ) : shift ? (
          <div className="flex flex-col gap-4">
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Shift dibuka</span>
                <span className="font-bold">{timeId(shift.started_at)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kas awal</span>
                <span className="font-bold">{rupiah(shift.starting_cash)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Penjualan tunai</span>
                <span className="font-bold">{rupiah(shift.cash_total ?? 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kas seharusnya</span>
                <span className="font-bold text-emerald-600">{rupiah(shift.expected_cash ?? 0)}</span>
              </div>
            </div>
            <div>
              <label className="label">Kas Fisik di Laci (Rp)</label>
              <input
                type="number"
                className="input text-lg font-black"
                placeholder={String(shift.expected_cash ?? 0)}
                value={endingCash}
                onChange={(e) => setEndingCash(e.target.value)}
              />
            </div>
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button onClick={() => setShiftModal(false)} className="btn-ghost flex-1">
                Batal
              </button>
              <button onClick={closeShift} className="btn-danger flex-1">
                Tutup Shift
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500">
              Setiap transaksi kasir tercatat ke shift aktif untuk rekap kas akhir hari. Shift wajib dibuka sebelum
              menerima pesanan.
            </p>
            <div>
              <label className="label">Modal Kas Awal (Rp)</label>
              <input
                type="number"
                className="input text-lg font-black"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {[0, 50000, 100000, 200000, 500000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setStartingCash(String(v))}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    {v === 0 ? "Rp 0" : rupiah(v)}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={openShift} className="btn-primary w-full py-3">
              ⏰ Buka Shift Sekarang
            </button>
          </div>
        )}
      </Modal>
    </main>
  );
}
