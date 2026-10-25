// Admin — Dashboard: KPI hari ini, tren 7 hari (Recharts), top produk, stok menipis, order terbaru
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dayLabel, rupiah, timeId, PAYMENT_LABEL } from "@/lib/format";
import type { DashboardData } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import { DonutChart, RevenueAreaChart } from "@/components/charts";
import {
  ArrowRight,
  Banknote,
  Bike,
  CircleAlert,
  CircleCheck,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  ShoppingBag,
  Trophy,
  Utensils,
  Wallet,
} from "lucide-react";
import Link from "next/link";

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">{label}</p>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
      </div>
      <p className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{value}</p>
      {sub && <p className="mt-1 truncate text-[11px] font-medium text-slate-500 sm:text-xs">{sub}</p>}
    </div>
  );
}

const TYPE_META: Record<string, { icon: React.ReactNode; cls: string }> = {
  "dine-in": { icon: <Utensils className="size-4" />, cls: "bg-sky-50 text-sky-600" },
  takeaway: { icon: <ShoppingBag className="size-4" />, cls: "bg-amber-50 text-amber-600" },
  delivery: { icon: <Bike className="size-4" />, cls: "bg-violet-50 text-violet-600" },
};

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type];
  if (!m) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className={`inline-flex size-7 items-center justify-center rounded-lg ${m.cls}`}>{m.icon}</span>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .get<DashboardData>("/reports/dashboard")
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
      </div>
    );
  }

  const { kpi, trend, top_products, recent_orders, low_stock, category_mix } = data;
  const trendData = trend.map((d) => ({ label: dayLabel(d.date), revenue: d.revenue }));
  const catData = category_mix.map((c) => ({ name: c.category, value: c.revenue }));
  const catTotal = category_mix.reduce((a, c) => a + c.revenue, 0);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Dashboard" subtitle="Ringkasan performa bisnis hari ini">
        <Link href="/admin/transactions" className="btn-ghost">
          <ReceiptText className="size-4" /> Semua Transaksi
        </Link>
        <Link href="/admin/reports" className="btn-primary">
          <LayoutDashboard className="size-4" /> Laporan
        </Link>
      </PageHeader>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Pendapatan Hari Ini"
          value={rupiah(kpi.revenue)}
          sub={`${kpi.orders_count} transaksi lunas`}
          icon={<Banknote className="size-5" />}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Estimasi Laba"
          value={rupiah(kpi.est_profit)}
          sub={`HPP ± ${rupiah(kpi.est_cost)} + pajak ${rupiah(kpi.tax_service)}`}
          icon={<PiggyBank className="size-5" />}
          accent="bg-sky-50 text-sky-600"
        />
        <KpiCard
          label="Rata-rata / Order"
          value={rupiah(kpi.avg_order)}
          sub={`${kpi.items_sold} item terjual`}
          icon={<Wallet className="size-5" />}
          accent="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Tunai vs Non-Tunai"
          value={rupiah(kpi.cash_total)}
          sub={`QRIS ${rupiah(kpi.qris_total)} · Kartu ${rupiah(kpi.debit_total + kpi.credit_total)}`}
          icon={<CreditCard className="size-5" />}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tren 7 hari */}
        <div className="card p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Tren Penjualan 7 Hari</h2>
              <p className="text-xs text-slate-500">Total pendapatan per hari (status lunas)</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <span className="size-2.5 rounded bg-amber-400" /> Area
              <span className="ml-2 size-2.5 rounded-full border-2 border-amber-400 bg-white" /> Titik data
            </div>
          </div>
          <RevenueAreaChart data={trendData} height={240} />
        </div>

        {/* Top produk */}
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-black text-slate-900">
            <Trophy className="size-4 text-amber-500" /> Terlaris Hari Ini
          </h2>
          {top_products.length === 0 && <p className="text-sm text-slate-400">Belum ada penjualan hari ini.</p>}
          <div className="space-y-3">
            {top_products.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                    i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{p.name}</p>
                  <p className="text-[11px] font-medium text-slate-400">{p.qty} pcs · {rupiah(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order terbaru */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-black text-slate-900">Transaksi Terbaru</h2>
            <Link href="/admin/transactions" className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700">
              Lihat semua <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] lg:min-w-0">
              <thead className="border-b border-slate-100">
                <tr>
                  <th className="th">No. Order</th>
                  <th className="th">Tipe</th>
                  <th className="th">Total</th>
                  <th className="th">Bayar</th>
                  <th className="th">Kasir</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recent_orders.length === 0 && (
                  <tr>
                    <td className="tdd text-slate-400" colSpan={6}>
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
                {recent_orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-50/60">
                    <td className="tdd font-mono text-xs font-bold text-slate-900">
                      {o.order_number}
                      <span className="block text-[10px] font-normal text-slate-400">{timeId(o.paid_at)}</span>
                    </td>
                    <td className="tdd">
                      <TypeBadge type={o.type} />
                    </td>
                    <td className="tdd font-bold">{rupiah(o.total)}</td>
                    <td className="tdd text-xs">{o.payment_method ? PAYMENT_LABEL[o.payment_method] : "—"}</td>
                    <td className="tdd text-xs">{o.cashier_name}</td>
                    <td className="tdd">
                      {o.status === "paid" && (
                        <span className="badge bg-emerald-50 text-emerald-600">
                          <CircleCheck className="size-3" /> Lunas
                        </span>
                      )}
                      {o.status === "open" && <span className="badge bg-amber-50 text-amber-600">Terbuka</span>}
                      {o.status === "void" && <span className="badge bg-slate-100 text-slate-500">Void</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {/* Stok menipis */}
          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-black text-slate-900">
              <CircleAlert className="size-4 text-red-500" /> Stok Menipis
            </h2>
            {low_stock.length === 0 && <p className="text-sm text-slate-400">Semua stok aman.</p>}
            <div className="space-y-2.5">
              {low_stock.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                  <span className="text-lg">{p.emoji}</span>
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{p.name}</p>
                  <span
                    className={`badge ${
                      p.stock === 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
            {low_stock.length > 0 && (
              <Link
                href="/admin/menu"
                className="mt-4 flex items-center justify-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                Kelola stok <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>

          {/* Mix kategori — donut */}
          <div className="card p-6">
            <h2 className="mb-2 text-base font-black text-slate-900">Penjualan per Kategori</h2>
            {catData.length === 0 && <p className="text-sm text-slate-400">Belum ada data.</p>}
            {catData.length > 0 && (
              <>
                <DonutChart data={catData} height={190} centerLabel="Total" centerValue={rupiah(catTotal)} />
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {category_mix.map((c, i) => (
                    <div key={c.category} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: ["#f59e0b", "#8b5cf6", "#10b981", "#0ea5e9", "#f43f5e", "#64748b"][i % 6] }}
                      />
                      <span className="min-w-0 truncate">{c.category}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
