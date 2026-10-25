// Komponen chart modern berbasis Recharts — dipakai Dashboard & Laporan admin.
// Gaya: area/bar dengan sudut membulat, grid putus-putus halus, tooltip kartu blur.
"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rupiah } from "@/lib/format";
import type { ReactElement } from "react";

const AXIS_STYLE = { stroke: "#94a3b8", fontSize: 11, fontWeight: 600 } as const;

export const DONUT_COLORS = ["#f59e0b", "#8b5cf6", "#10b981", "#0ea5e9", "#f43f5e", "#64748b"];

// 12.500 -> "13rb", 3.400.000 -> "3,4jt"
function shortRupiah(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",")}jt`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}rb`;
  return String(v);
}

type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: { name?: string; dataKey?: string | number; value?: number; color?: string }[];
};

function MoneyTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-xl shadow-slate-900/10 backdrop-blur">
      {label !== undefined && (
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="mt-0.5 flex items-center gap-1.5 text-sm font-black text-slate-800">
          <span className="size-2 rounded-full" style={{ background: p.color ?? "#f59e0b" }} />
          {p.name}: {rupiah(Number(p.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

function ChartFrame({ height, children }: { height: number; children: ReactElement }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

// Tren pendapatan — area lembut dengan garis tebal (dashboard & laporan harian)
export function RevenueAreaChart({
  data,
  height = 260,
}: {
  data: { label: string; revenue: number }[];
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_STYLE} dy={8} />
        <YAxis width={60} tickLine={false} axisLine={false} tick={AXIS_STYLE} tickFormatter={shortRupiah} />
        <Tooltip content={<MoneyTooltip />} cursor={{ stroke: "#fbbf24", strokeDasharray: "4 4" }} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Pendapatan"
          stroke="#f59e0b"
          strokeWidth={2.5}
          fill="url(#revFill)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: "#f59e0b" }}
        />
      </AreaChart>
    </ChartFrame>
  );
}

// Diagram batang per kategori waktu (harian / per jam)
export function RevenueBarChart({
  data,
  height = 220,
  color = "#f59e0b",
  emptyColor = "#e2e8f0",
  xFontSize = 10,
}: {
  data: { label: string; revenue: number }[];
  height?: number;
  color?: string;
  emptyColor?: string;
  xFontSize?: number;
}) {
  return (
    <ChartFrame height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          dy={8}
          interval={0}
          tick={{ ...AXIS_STYLE, fontSize: xFontSize }}
        />
        <YAxis width={56} tickLine={false} axisLine={false} tick={AXIS_STYLE} tickFormatter={shortRupiah} />
        <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(100,116,139,0.06)" }} />
        <Bar dataKey="revenue" name="Pendapatan" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.revenue > 0 ? color : emptyColor} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

// Donut dengan total di tengah (mix kategori / metode bayar)
export function DonutChart({
  data,
  height = 220,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const hasData = data.some((d) => d.value > 0);
  const chartData = hasData ? data : [{ name: "Belum ada data", value: 1 }];
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="64%"
            outerRadius="90%"
            paddingAngle={3}
            cornerRadius={6}
            strokeWidth={0}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={hasData ? DONUT_COLORS[i % DONUT_COLORS.length] : "#e2e8f0"} />
            ))}
          </Pie>
          {hasData && <Tooltip content={<MoneyTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{centerLabel}</p>
          <p className="text-lg font-black tracking-tight text-slate-900">{centerValue}</p>
        </div>
      )}
    </div>
  );
}
