// Admin — laporan penjualan periode + analitik (chart Recharts, export Excel)
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dayLabel, rupiah, ORDER_TYPE_LABEL, todayInput } from "@/lib/format";
import type { SalesReport } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import { DonutChart, RevenueAreaChart, RevenueBarChart } from "@/components/charts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bike,
  CreditCard,
  FileSpreadsheet,
  Search,
  QrCode,
  ShoppingBag,
  Trophy,
  Utensils,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useToast } from "@/lib/toast";

const TYPE_META: Record<string, ReactNode> = {
  "dine-in": <Utensils className="size-3.5" />,
  takeaway: <ShoppingBag className="size-3.5" />,
  delivery: <Bike className="size-3.5" />,
};

function delta(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

export default function ReportsPage() {
  // Default: 7 hari terakhir
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(todayInput());
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      setData(await api.get<SalesReport>(`/reports/sales?from=${from}&to=${to}`));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat laporan", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jam operasional 06–23 untuk grafik per jam
  const hours = data
    ? Array.from({ length: 24 }, (_, h) => {
        const found = data.hourly.find((x) => x.hour === h);
        return { hour: h, revenue: found?.revenue ?? 0, orders_count: found?.orders_count ?? 0 };
      }).filter((x) => x.hour >= 6 && x.hour <= 23)
    : [];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Laporan Penjualan" subtitle="Analitik periode dengan perbandingan periode sebelumnya">
        <button
          onClick={() => api.download(`/reports/export?from=${from}&to=${to}&format=xlsx`, `laporan-${from}_${to}.xlsx`)}
          className="btn-primary"
        >
          <FileSpreadsheet className="size-4" /> Export Excel
        </button>
      </PageHeader>

      <div className="card mb-6 flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="label">Dari</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Sampai</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-dark">
          <Search className="size-4" /> Tampilkan
        </button>
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* Ringkasan */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              { label: "Pendapatan", value: data.summary.revenue, prev: data.prev.revenue, money: true },
              { label: "Transaksi", value: data.summary.orders_count, prev: data.prev.orders_count, money: false },
              { label: "Rata-rata / Order", value: data.summary.avg_order, prev: data.prev.avg_order, money: true },
              { label: "Estimasi Laba", value: data.summary.est_profit, prev: data.prev.est_profit, money: true },
            ].map((k) => {
              const d = delta(k.value, k.prev);
              return (
                <div key={k.label} className="card p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{k.label}</p>
                  <p className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">
                    {k.money ? rupiah(k.value) : k.value}
                  </p>
                  <p className={`mt-1 flex items-center gap-1 text-xs font-bold ${d >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {d >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {Math.abs(d)}% vs periode sebelumnya
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Grafik harian */}
            <div className="card p-6 lg:col-span-2">
              <h2 className="mb-1 text-base font-black text-slate-900">Pendapatan Harian</h2>
              <p className="mb-5 text-xs text-slate-500">
                {data.from} s/d {data.to}
              </p>
              {data.daily.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Belum ada transaksi lunas di periode ini.</p>
              ) : (
                <RevenueAreaChart
                  data={data.daily.map((d) => ({ label: dayLabel(d.date), revenue: d.revenue }))}
                  height={260}
                />
              )}
            </div>

            {/* Metode bayar + tipe */}
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="mb-2 text-sm font-black text-slate-900">Metode Pembayaran</h2>
                <DonutChart
                  data={[
                    { name: "Tunai", value: data.summary.cash_total },
                    { name: "QRIS", value: data.summary.qris_total },
                    { name: "Debit", value: data.summary.debit_total },
                    { name: "Kredit", value: data.summary.credit_total },
                  ]}
                  height={170}
                  centerLabel="Total"
                  centerValue={rupiah(
                    data.summary.cash_total + data.summary.qris_total + data.summary.debit_total + data.summary.credit_total
                  )}
                />
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {[
                    { label: "Tunai", v: data.summary.cash_total, icon: <Wallet className="size-3.5" /> },
                    { label: "QRIS", v: data.summary.qris_total, icon: <QrCode className="size-3.5" /> },
                    { label: "Debit", v: data.summary.debit_total, icon: <CreditCard className="size-3.5" /> },
                    { label: "Kredit", v: data.summary.credit_total, icon: <CreditCard className="size-3.5" /> },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      <span className="text-slate-400">{m.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{m.label}</span>
                      <span className="text-slate-400">{rupiah(m.v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h2 className="mb-4 text-sm font-black text-slate-900">Tipe Pesanan</h2>
                {data.by_type.length === 0 && <p className="text-xs text-slate-400">Belum ada data.</p>}
                {data.by_type.map((t) => (
                  <div key={t.type} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <span className="text-slate-400">{TYPE_META[t.type]}</span>
                      {ORDER_TYPE_LABEL[t.type]}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {t.orders_count}× · {rupiah(t.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Best seller */}
            <div className="card overflow-hidden">
              <h2 className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 text-base font-black text-slate-900">
                <Trophy className="size-4 text-amber-500" /> Menu Terlaris Periode Ini
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] lg:min-w-0">
                  <thead className="border-b border-slate-100 bg-slate-50/60">
                    <tr>
                      <th className="th">#</th>
                      <th className="th">Menu</th>
                      <th className="th">Qty</th>
                      <th className="th">Pendapatan</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.best_sellers.length === 0 && (
                    <tr>
                      <td className="tdd text-center text-slate-400" colSpan={4}>
                        Belum ada data.
                      </td>
                    </tr>
                  )}
                  {data.best_sellers.map((b, i) => (
                    <tr key={b.name}>
                      <td className="tdd w-10 font-black text-slate-300">{i + 1}</td>
                      <td className="tdd font-bold">{b.name}</td>
                      <td className="tdd">{b.qty} pcs</td>
                      <td className="tdd font-bold text-amber-600">{rupiah(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>

            {/* Jam sibuk */}
            <div className="card p-6">
              <h2 className="mb-5 text-base font-black text-slate-900">Penjualan per Jam</h2>
              {data.hourly.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada data.</p>
              ) : (
                <RevenueBarChart
                  data={hours.map((h) => ({ label: String(h.hour).padStart(2, "0"), revenue: h.revenue }))}
                  height={210}
                  color="#8b5cf6"
                  xFontSize={9}
                />
              )}
              <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <span className="size-2.5 rounded bg-violet-400" /> Jam ramai menunjukkan kapan promosi atau staf ekstra paling efektif.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
