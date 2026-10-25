// Admin — CRUD Kategori
"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { useToast } from "@/lib/toast";

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function load() {
    try {
      setCats(await api.get<Category[]>("/admin/categories"));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat", "error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setEmoji("🍽️");
    setOpen(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setEmoji(c.emoji);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.patch(`/admin/categories/${editing.id}`, { name, emoji });
      else await api.post("/admin/categories", { name, emoji });
      toast(editing ? "Kategori diperbarui" : "Kategori ditambahkan");
      setOpen(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(c: Category) {
    if (!confirm(`Hapus kategori "${c.name}"?`)) return;
    try {
      await api.del(`/admin/categories/${c.id}`);
      toast("Kategori dihapus");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menghapus", "error");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Kategori" subtitle="Atur grup menu untuk tampilan kasir yang rapi">
        <button onClick={openCreate} className="btn-primary">
          + Kategori Baru
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cats.map((c) => (
          <div key={c.id} className="card flex items-center gap-4 p-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-3xl">
              {c.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-slate-900">{c.name}</p>
              <p className="text-xs font-semibold text-slate-400">{c.product_count ?? 0} produk</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => openEdit(c)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
              >
                <Pencil className="mr-1 inline size-3.5" /> Edit
              </button>
              <button
                onClick={() => onDelete(c)}
                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
              >
                <Trash2 className="mr-1 inline size-3.5" /> Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Kategori" : "Kategori Baru"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nama Kategori</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Emoji</label>
            <input className="input" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
            <p className="mt-1 text-xs text-slate-400">Contoh: ☕ 🍛 🍟 🍰 🎁</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
