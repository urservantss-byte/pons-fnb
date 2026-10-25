// Admin — CRUD Modifier (opsi tambahan produk: level pedas, topping, dst.)
"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import type { Modifier } from "@/lib/types";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { useToast } from "@/lib/toast";

const digits = (s: string) => s.replace(/\D/g, "");
const formatRp = (s: string) => (s ? Number(s).toLocaleString("id-ID") : "");

export default function ModifiersPage() {
  const [mods, setMods] = useState<Modifier[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Modifier | null>(null);
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function load() {
    try {
      setMods(await api.get<Modifier[]>("/admin/modifiers"));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat", "error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate(group?: string) {
    setEditing(null);
    setGroupName(group || "");
    setName("");
    setPrice("");
    setOpen(true);
  }

  function openEdit(m: Modifier) {
    setEditing(m);
    setGroupName(m.group_name);
    setName(m.name);
    setPrice(m.price ? formatRp(String(m.price)) : "0");
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { group_name: groupName.trim(), name: name.trim(), price: Number(digits(price) || 0) };
    try {
      if (editing) {
        await api.put(`/admin/modifiers/${editing.id}`, payload);
        toast("Modifier diperbarui");
      } else {
        await api.post("/admin/modifiers", payload);
        toast("Modifier ditambahkan");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(m: Modifier) {
    if (!confirm(`Hapus modifier "${m.group_name}: ${m.name}"?`)) return;
    try {
      await api.del(`/admin/modifiers/${m.id}`);
      toast("Modifier dihapus");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menghapus", "error");
    }
  }

  // Kelompokkan by group_name
  const groups: Record<string, Modifier[]> = {};
  for (const m of mods) (groups[m.group_name] ||= []).push(m);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Modifier"
        subtitle="Opsi tambahan produk — level pedas, ukuran, topping, gula, dll."
      >
        <button onClick={() => openCreate()} className="btn-primary">
          <Plus className="mr-1.5 inline size-4" />
          Modifier Baru
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-800">
                <Zap className="size-4 text-amber-500" /> {group}
              </h2>
              <button
                onClick={() => openCreate(group)}
                className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-amber-600 hover:ring-amber-300"
                title={`Tambah opsi ke grup ${group}`}
              >
                <Plus className="size-3.5" /> Opsi
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {items.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{m.name}</p>
                  <p className={`text-sm font-black ${m.price ? "text-amber-600" : "text-emerald-600"}`}>
                    {m.price ? `+${rupiah(m.price)}` : "Gratis"}
                  </p>
                  <span className="badge bg-slate-100 text-slate-400">{m.product_count ?? 0} produk</span>
                  <button
                    onClick={() => openEdit(m)}
                    className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200"
                    title="Edit modifier"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(m)}
                    className="rounded-lg bg-red-50 p-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                    title="Hapus modifier"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(groups).length === 0 && (
          <div className="card col-span-full flex flex-col items-center gap-3 p-12 text-center">
            <Zap className="size-10 text-slate-300" />
            <p className="font-bold text-slate-500">Belum ada modifier.</p>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Modifier" : "Modifier Baru"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nama Grup</label>
            <input
              className="input"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="cth: Level Pedas"
              required
              autoFocus
            />
            {editing && (
              <p className="mt-1 text-xs text-slate-400">
                Mengubah nama grup akan memindahkan opsi ini ke grup tersebut.
              </p>
            )}
          </div>
          <div>
            <label className="label">Nama Opsi</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Level 5"
              required
            />
          </div>
          <div>
            <label className="label">Tambahan Harga (Rp)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                className="input pl-10"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(formatRp(digits(e.target.value)))}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">0 = gratis (mis. level pedas)</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Tambah"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
