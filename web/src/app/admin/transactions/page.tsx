// Admin — daftar transaksi dengan filter + detail + void
"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getAuth } from "@/lib/api";
import { dateTimeId, rupiah, ORDER_TYPE_LABEL, PAYMENT_LABEL, STATUS_LABEL, todayInput } from "@/lib/format";
import type { Meta, Order } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import Receipt from "@/components/Receipt";
import { useToast } from "@/lib/toast";

import { Bike, Download, Eye, Printer, Search, ShoppingBag, UserRound, Utensils } from "lucide-react";
import type { ReactNode } from "react";

const TYPE_ICON: Record<string, ReactNode> = {
  "dine-in": <Utensils className="size-3.5" />,
  takeaway: <ShoppingBag className="size-3.5" />,
  delivery: <Bike className="size-3.5" />,
};

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [from, setFrom] = useState(todayInput());
  const [to, setTo] = useState(todayInput());
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Order | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to });
      if (status) q.set("status", status);
      setOrders(await api.get<Order[]>(`/reports/transactions?${q}`));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get<Meta>("/catalog/meta").then(setMeta).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDetail(o: Order) {
    try {
      setDetail(await api.get<Order>(`/orders/${o.id}`));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat detail", "error");
    }
  }

  async function onVoid(o: Order) {
    const reason = prompt(`Alasan void transaksi ${o.order_number}?`);
    if (reason === null) return;
    try {
      await api.post(`/orders/${o.id}/void`, { reason });
      toast("Transaksi dibatalkan (stok dikembalikan)");
      setDetail(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal void", "error");
    }
  }

  const totals = useMemo(() => {
    const sum = (f: (o: Order) => number) => orders.reduce((s, o) => s + f(o), 0);
    return {
      count: orders.length,
      revenue: sum((o) => (o.status === "paid" ? o.total : 0)),
      open: orders.filter((o) => o.status === "open").length,
      void: orders.filter((o) => o.status === "void").length,
    };
  }, [orders]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Transaksi" subtitle="Semua pesanan: lunas, terbuka, dan void">
        {getAuth()?.user.role === "admin" && (
          <button
            onClick={() => api.download(`/reports/export?from=${from}&to=${to}&format=xlsx`, `laporan-${from}.xlsx`)}
            className="btn-ghost"
          >
            <Download className="size-4" /> Export Excel
          </button>
        )}
      </PageHeader>

      {/* Filter */}
      <div className="card mb-5 grid grid-cols-2 items-end gap-3 p-4 lg:flex lg:flex-wrap lg:items-end lg:gap-4">
        <div>
          <label className="label">Dari Tanggal</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Sampai</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua</option>
            <option value="paid">Lunas</option>
            <option value="open">Terbuka</option>
            <option value="void">Void</option>
          </select>
        </div>
        <button onClick={load} className="btn-dark">
          <Search className="size-4" /> Terapkan
        </button>
        <div className="col-span-2 flex justify-between gap-3 border-t border-slate-100 pt-3 lg:ml-auto lg:gap-6 lg:border-0 lg:pr-2 lg:pt-0">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Transaksi</p>
            <p className="text-lg font-black text-slate-900">{totals.count}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Pendapatan</p>
            <p className="text-lg font-black text-emerald-600">{rupiah(totals.revenue)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Terbuka</p>
            <p className="text-lg font-black text-amber-600">{totals.open}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Void</p>
            <p className="text-lg font-black text-slate-400">{totals.void}</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] lg:min-w-0">
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <th className="th">No. Order</th>
                <th className="th">Waktu</th>
                <th className="th">Tipe</th>
                <th className="th">Kasir</th>
                <th className="th">Item</th>
                <th className="th">Total</th>
                <th className="th">Metode</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td className="tdd" colSpan={9}>
                    <div className="flex justify-center py-6">
                      <div className="size-7 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td className="tdd py-10 text-center text-slate-400" colSpan={9}>
                    Tidak ada transaksi pada rentang ini.
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-slate-50/60">
                  <td className="tdd font-mono text-xs font-bold text-slate-900">{o.order_number}</td>
                  <td className="tdd text-xs">{dateTimeId(o.created_at)}</td>
                  <td className="tdd">
                    {TYPE_ICON[o.type]} <span className="hidden text-xs lg:inline">{ORDER_TYPE_LABEL[o.type]}</span>
                  </td>
                  <td className="tdd text-xs">{o.cashier_name}</td>
                  <td className="tdd text-xs">{o.item_count} item</td>
                  <td className="tdd font-black">{rupiah(o.total)}</td>
                  <td className="tdd text-xs">{o.payment_method ? PAYMENT_LABEL[o.payment_method] : "—"}</td>
                  <td className="tdd">
                    <span
                      className={`badge ${
                        o.status === "paid"
                          ? "bg-emerald-50 text-emerald-600"
                          : o.status === "open"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="tdd">
                    <button
                      onClick={() => openDetail(o)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                    >
                      <Eye className="size-3.5" /> Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detail transaksi */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Detail ${detail?.order_number ?? ""}`} size="lg">
        {detail && (
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="badge bg-slate-100 text-slate-600">
                  {TYPE_ICON[detail.type]} {ORDER_TYPE_LABEL[detail.type]}
                  {detail.table_name ? ` · ${detail.table_name}` : ""}
                </span>
                <span className="badge bg-slate-100 text-slate-600"><UserRound className="size-3.5" /> {detail.cashier_name}</span>
                {detail.customer_name && (
                  <span className="badge bg-sky-50 text-sky-700">
                    <UserRound className="size-3.5" /> {detail.customer_name}
                    {detail.customer_phone ? ` · ${detail.customer_phone}` : ""}
                  </span>
                )}
                <span
                  className={`badge ${
                    detail.status === "paid"
                      ? "bg-emerald-50 text-emerald-600"
                      : detail.status === "open"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {STATUS_LABEL[detail.status]}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {detail.items?.map((it) => {
                    let mods: { id: number; name: string; price: number }[] = [];
                    try {
                      mods = JSON.parse(it.modifiers || "[]");
                    } catch {
                      /* ignore */
                    }
                    return (
                      <tr key={it.id}>
                        <td className="py-2.5">
                          <p className="font-bold text-slate-800">
                            {it.qty}× {it.name}
                          </p>
                          {mods.length > 0 && (
                            <p className="text-xs text-violet-600">+ {mods.map((m) => m.name).join(", ")}</p>
                          )}
                          {it.notes && <p className="text-xs italic text-slate-400">“{it.notes}”</p>}
                        </td>
                        <td className="py-2.5 text-right font-bold">{rupiah(it.line_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span> <span>{rupiah(detail.subtotal)}</span>
                </div>
                {detail.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Diskon</span> <span>-{rupiah(detail.discount)}</span>
                  </div>
                )}
                {detail.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Pajak {detail.tax_rate}%</span> <span>{rupiah(detail.tax_amount)}</span>
                  </div>
                )}
                {detail.service_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Servis {detail.service_rate}%</span> <span>{rupiah(detail.service_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900">
                  <span>Total</span> <span>{rupiah(detail.total)}</span>
                </div>
                {detail.payment_method === "cash" && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Tunai</span> <span>{rupiah(detail.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Kembalian</span> <span>{rupiah(detail.change_amount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {meta && detail.status === "paid" && <Receipt order={detail} meta={meta} />}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          {meta && detail?.status === "paid" && (
            <button onClick={() => window.print()} className="btn-ghost">
              <Printer className="size-4" /> Cetak Struk
            </button>
          )}
          {detail && detail.status !== "void" && (
            <button onClick={() => onVoid(detail)} className="btn-danger">
             Void Transaksi
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
