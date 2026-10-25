// Admin — CRUD Pengguna (kasir & admin)
"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, getAuth } from "@/lib/api";
import { dateTimeId } from "@/lib/format";
import type { AuthUser } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { useToast } from "@/lib/toast";
import { BadgeCheck, CircleUserRound, Crown, Pencil, Power } from "lucide-react";

interface UserRow extends AuthUser {
  is_active: number;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "cashier" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const me = getAuth()?.user;

  async function load() {
    try {
      setUsers(await api.get<UserRow[]>("/admin/users"));
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
    setForm({ name: "", username: "", password: "", role: "cashier" });
    setOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({ name: u.name, username: u.username, password: "", role: u.role });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing && form.password.length < 6) {
      toast("Password minimal 6 karakter", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = { name: form.name, role: form.role };
        if (form.password) body.password = form.password;
        await api.patch(`/admin/users/${editing.id}`, body);
        toast("Pengguna diperbarui");
      } else {
        await api.post("/admin/users", form);
        toast("Pengguna ditambahkan");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(u: UserRow) {
    try {
      await api.patch(`/admin/users/${u.id}`, { is_active: u.is_active ? 0 : 1 });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal mengubah", "error");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Pengguna" subtitle="Kelola akun admin dan kasir">
        <button onClick={openCreate} className="btn-primary">
          + Pengguna Baru
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] lg:min-w-0">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th className="th">Nama</th>
                <th className="th">Username</th>
                <th className="th">Role</th>
                <th className="th">Dibuat</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="transition hover:bg-slate-50/60">
                  <td className="tdd">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                          u.role === "admin" ? "bg-zinc-900" : "bg-amber-500"
                        }`}
                      >
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-800">
                        {u.name}
                        {u.id === me?.id && <span className="ml-1.5 text-[10px] font-bold text-amber-600">(Anda)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="tdd font-mono text-xs">{u.username}</td>
                  <td className="tdd">
                    <span
                      className={`badge ${u.role === "admin" ? "bg-zinc-100 text-zinc-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {u.role === "admin" ? (
                        <><Crown className="size-3.5" /> Admin</>
                      ) : (
                        <><CircleUserRound className="size-3.5" /> Kasir</>
                      )}
                    </span>
                  </td>
                  <td className="tdd text-xs">{dateTimeId(u.created_at)}</td>
                  <td className="tdd">
                    <span className={`badge ${u.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {u.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="tdd">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      {u.id !== me?.id && (
                        <button
                          onClick={() => onToggleActive(u)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                            u.is_active
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          }`}
                        >
                          {u.is_active ? <><Power className="size-3.5" /> Nonaktifkan</> : <><BadgeCheck className="size-3.5" /> Aktifkan</>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Pengguna" : "Pengguna Baru"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nama Lengkap</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div>
            <label className="label">Username</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!!editing}
              required
            />
            {editing && <p className="mt-1 text-xs text-slate-400">Username tidak bisa diubah.</p>}
          </div>
          <div>
            <label className="label">{editing ? "Password Baru (kosongkan jika tetap)" : "Password"}</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? "••••••" : "Minimal 6 karakter"}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "cashier", label: "Kasir", desc: "Akses halaman kasir" },
                { v: "admin", label: "Admin", desc: "Akses semua menu" },
              ].map((r) => (
                <button
                  type="button"
                  key={r.v}
                  onClick={() => setForm({ ...form, role: r.v })}
                  className={`rounded-xl border p-3 text-left transition ${
                    form.role === r.v ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-800">{r.label}</p>
                  <p className="text-[11px] text-slate-400">{r.desc}</p>
                </button>
              ))}
            </div>
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
