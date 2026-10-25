// Admin — CRUD Meja
"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Table } from "@/lib/types";
import { Armchair, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { useToast } from "@/lib/toast";

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  available: { label: "Kosong", cls: "bg-emerald-50 text-emerald-600" },
  occupied: { label: "Terisi", cls: "bg-amber-50 text-amber-600" },
  reserved: { label: "Reservasi", cls: "bg-violet-50 text-violet-600" },
};

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(2);
  const [status, setStatus] = useState<Table["status"]>("available");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function load() {
    try {
      setTables(await api.get<Table[]>("/admin/tables"));
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
    setCapacity(2);
    setStatus("available");
    setOpen(true);
  }

  function openEdit(t: Table) {
    setEditing(t);
    setName(t.name);
    setCapacity(t.capacity);
    setStatus(t.status);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.patch(`/admin/tables/${editing.id}`, { name, capacity, status });
      else await api.post("/admin/tables", { name, capacity });
      toast(editing ? "Meja diperbarui" : "Meja ditambahkan");
      setOpen(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(t: Table) {
    if (!confirm(`Hapus ${t.name}?`)) return;
    try {
      await api.del(`/admin/tables/${t.id}`);
      toast("Meja dihapus");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menghapus", "error");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Meja" subtitle="Denah meja untuk pesanan dine-in">
        <button onClick={openCreate} className="btn-primary">
          + Meja Baru
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {tables.map((t) => {
          const s = STATUS_STYLE[t.status];
          return (
            <div key={t.id} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <Armchair className="size-6 text-slate-300" />
                <span className={`badge ${s.cls}`}>{s.label}</span>
              </div>
              <p className="text-base font-black text-slate-900">{t.name}</p>
              <p className="mb-3 text-xs font-semibold text-slate-400">{t.capacity} kursi</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => openEdit(t)}
                  className="flex-1 rounded-lg bg-slate-100 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  <Pencil className="mx-auto size-3.5" />
                </button>
                <button
                  onClick={() => onDelete(t)}
                  className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Meja" : "Meja Baru"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nama Meja</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Meja 09" required autoFocus />
          </div>
          <div>
            <label className="label">Jumlah Kursi</label>
            <input
              type="number"
              min={1}
              max={20}
              className="input"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </div>
          {editing && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Table["status"])}>
                <option value="available">Kosong</option>
                <option value="occupied">Terisi</option>
                <option value="reserved">Reservasi</option>
              </select>
            </div>
          )}
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
