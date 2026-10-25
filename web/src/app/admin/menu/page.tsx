// Admin — CRUD Menu (produk) + manajemen stok
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import type { Category, Modifier, Product } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { useToast } from "@/lib/toast";
import { PackageOpen, PackagePlus, Pencil, Search, Trash2, TriangleAlert, UtensilsCrossed } from "lucide-react";
import ProductPhotoInput from "@/components/ProductPhotoInput";
import { assetUrl } from "@/lib/api";

const EMPTY_PRODUCT = {
  name: "",
  category_id: 0,
  description: "",
  emoji: "🍽️",
  price: "",
  cost: "",
  stock: "-1",
  low_stock_at: "5",
  is_available: 1,
  sort: 0,
  modifier_ids: [] as number[],
};

// Hapus pemisah ribuan -> angka murni utk harga (selalu >= 0)
const digits = (s: string) => Number(String(s).replace(/\D/g, "")) || 0;

// Parser int yang izinkan minus (untuk stok: -1 = tanpa pelacakan)
const intOf = (s: string) => {
  const n = parseInt(String(s).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
};

// 15000 -> "15.000" (hanya tampilan di input)
function formatRp(s: string) {
  const d = String(s).replace(/\D/g, "");
  return d ? Number(d).toLocaleString("id-ID") : "";
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierList, setModifierList] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<number | "all">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [saving, setSaving] = useState(false);

  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockType, setStockType] = useState<"in" | "adjust">("in");
  const [stockNote, setStockNote] = useState("");

  const toast = useToast();

  async function load() {
    try {
      const [p, c, m] = await Promise.all([
        api.get<Product[]>("/admin/products"),
        api.get<Category[]>("/admin/categories"),
        api.get<Modifier[]>("/admin/modifiers"),
      ]);
      setProducts(p);
      setCategories(c);
      setModifierList(m);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        (filterCat === "all" || p.category_id === filterCat) &&
        (!q || p.name.toLowerCase().includes(q) || (p.category_name || "").toLowerCase().includes(q))
    );
  }, [products, search, filterCat]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_PRODUCT, category_id: categories[0]?.id ?? 0 });
    setFormOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      category_id: p.category_id,
      description: p.description,
      emoji: p.emoji,
      price: formatRp(String(p.price)),
      cost: p.cost ? formatRp(String(p.cost)) : "",
      stock: String(p.stock),
      low_stock_at: String(p.low_stock_at),
      is_available: p.is_available,
      sort: p.sort,
      modifier_ids: p.modifier_ids || [],
    });
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast("Nama produk wajib diisi", "error");
    if (digits(form.price) <= 0) return toast("Harga jual harus lebih dari 0", "error");
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: digits(form.price),
        cost: digits(form.cost),
        stock: intOf(form.stock),
        low_stock_at: digits(form.low_stock_at),
      };
      if (editing) {
        await api.patch(`/admin/products/${editing.id}`, payload);
        toast("Produk diperbarui");
      } else {
        await api.post("/admin/products", payload);
        toast("Produk ditambahkan");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: Product) {
    if (!confirm(`Hapus "${p.name}"? Riwayat transaksi lama tidak terhapus.`)) return;
    try {
      await api.del(`/admin/products/${p.id}`);
      toast("Produk dihapus");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menghapus", "error");
    }
  }

  async function onToggleAvailable(p: Product) {
    try {
      await api.patch(`/admin/products/${p.id}`, { is_available: p.is_available ? 0 : 1 });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal mengubah", "error");
    }
  }

  async function onStockSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stockTarget) return;
    try {
      await api.post(`/admin/products/${stockTarget.id}/stock`, {
        type: stockType,
        qty: Number(stockQty),
        note: stockNote,
      });
      toast("Stok diperbarui");
      setStockTarget(null);
      setStockQty("");
      setStockNote("");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui stok", "error");
    }
  }

  const grouped = useMemo(() => {
    const byCat: Record<number, Product[]> = {};
    for (const p of filtered) (byCat[p.category_id] ||= []).push(p);
    return byCat;
  }, [filtered]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Menu & Stok" subtitle={`${products.length} produk terdaftar`}>
        <button onClick={openCreate} className="btn-primary">
          + Produk Baru
        </button>
      </PageHeader>

      {/* Filter */}
      <div className="relative mb-6 flex flex-wrap items-center gap-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input max-w-xs pl-10"
          placeholder="Cari menu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCat("all")}
            className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${
              filterCat === "all" ? "bg-zinc-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                filterCat === c.id ? "bg-zinc-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <UtensilsCrossed className="size-10 text-slate-300" />
          <p className="font-bold text-slate-700">Tidak ada produk cocok</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories
            .filter((c) => grouped[c.id])
            .map((c) => (
              <div key={c.id}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-400">
                  <span className="text-base">{c.emoji}</span> {c.name}
                  <span className="badge bg-slate-100 text-slate-500">{grouped[c.id].length}</span>
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {grouped[c.id].map((p) => {
                    const lowStock = p.stock >= 0 && p.stock <= p.low_stock_at;
                    return (
                      <div
                        key={p.id}
                        className={`card group p-4 transition hover:shadow-md ${!p.is_available ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-2xl">
                            {p.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={assetUrl(p.photo_url) ?? undefined} alt={p.name} className="size-full object-cover" />
                            ) : (
                              <span>{p.emoji}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">{p.name}</p>
                            <p className="truncate text-xs text-slate-400">{p.description || p.category_name}</p>
                          </div>
                          <button
                            onClick={() => onToggleAvailable(p)}
                            title={p.is_available ? "Tandai habis" : "Tandai tersedia"}
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase transition ${
                              p.is_available
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            {p.is_available ? "Tersedia" : "Habis"}
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-base font-black text-amber-600">{rupiah(p.price)}</p>
                          <p className="text-xs font-semibold text-slate-400">
                            {p.stock < 0 ? (
                              "∞ tanpa batas"
                            ) : (
                              <span className={lowStock ? "text-red-500" : "text-slate-500"}>
                                Stok {p.stock}
                                {lowStock && <TriangleAlert className="ml-1 inline size-3.5 text-red-500" />}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(p.modifier_ids || []).length > 0 ? (
                              (p.modifier_ids || [])
                                .map((id) => modifierList.find((m) => m.id === id))
                                .filter(Boolean)
                                .map((m) => (
                                  <span key={m!.id} className="badge bg-violet-50 text-violet-600">
                                    {m!.group_name} · {m!.name}
                                  </span>
                                ))
                            ) : (
                              <span className="text-[11px] font-medium text-slate-300">Tanpa modifier</span>
                            )}
                            {p.description && p.description !== "" && null}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => openEdit(p)} className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200">
                              <Pencil className="size-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setStockTarget(p);
                                setStockType("in");
                              }}
                              className="flex items-center justify-center gap-1 rounded-lg bg-sky-50 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                            >
                              <PackagePlus className="size-3.5" /> Stok
                            </button>
                            <button
                              onClick={() => onDelete(p)}
                              className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                              title="Hapus"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal form produk */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit Produk" : "Produk Baru"} size="lg">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nama Produk</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Foto Produk (persegi, otomatis di-crop)</label>
            <ProductPhotoInput
              product={editing}
              onSaved={(p) => {
                setEditing(p);
                load();
              }}
            />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select
              className="input"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Emoji / Ikon (cadangan)</label>
            <input className="input" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={4} />
          </div>
          <div>
            <label className="label">Harga Jual (Rp)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                className="input pl-10"
                placeholder="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: formatRp(e.target.value) })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">HPP / Modal (Rp)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                className="input pl-10"
                placeholder="0"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: formatRp(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="label">Stok (-1 = tanpa pelacakan)</label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="-1"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/[^\d-]/g, "") })}
            />
          </div>
          <div>
            <label className="label">Batas Stok Menipis</label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="5"
              value={form.low_stock_at}
              onChange={(e) => setForm({ ...form, low_stock_at: formatRp(e.target.value) })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Deskripsi</label>
            <textarea
              className="input min-h-16"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Modifier tersedia untuk produk ini</label>
            <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-3">
              {modifierList.length === 0 && <p className="text-xs text-slate-400">Belum ada modifier — tambahkan di menu Modifier.</p>}
              {modifierList.map((m) => {
                const checked = form.modifier_ids.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                      checked ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-violet-600"
                      checked={checked}
                      onChange={() =>
                        setForm({
                          ...form,
                          modifier_ids: checked
                            ? form.modifier_ids.filter((i) => i !== m.id)
                            : [...form.modifier_ids, m.id],
                        })
                      }
                    />
                    <span className="min-w-0 truncate">
                      {m.group_name}: {m.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-ghost">
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal stok */}
      <Modal open={!!stockTarget} onClose={() => setStockTarget(null)} title={`Stok — ${stockTarget?.name ?? ""}`}>
        <form onSubmit={onStockSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Stok saat ini:{" "}
            <span className="font-bold text-slate-800">{stockTarget ? (stockTarget.stock < 0 ? "tanpa pelacakan" : stockTarget.stock) : ""}</span>
          </p>
          <div>
            <label className="label">Jenis penyesuaian</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStockType("in")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  stockType === "in" ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500"
                }`}
              >
                <PackagePlus className="size-4" /> Stok Masuk
              </button>
              <button
                type="button"
                onClick={() => setStockType("adjust")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  stockType === "adjust" ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500"
                }`}
              >
                <PackageOpen className="size-4" /> Set Ulang Jadi
              </button>
            </div>
          </div>
          <div>
            <label className="label">{stockType === "in" ? "Jumlah masuk" : "Stok baru"}</label>
            <input
              type="number"
              min={0}
              className="input"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              placeholder="cth: 50"
              required
            />
          </div>
          <div>
            <label className="label">Catatan (opsional)</label>
            <input className="input" value={stockNote} onChange={(e) => setStockNote(e.target.value)} placeholder="cth: restock dari supplier" />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setStockTarget(null)} className="btn-ghost">
              Batal
            </button>
            <button type="submit" className="btn-primary">
              Simpan Stok
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
