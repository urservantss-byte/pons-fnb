// Struk: pratinjau di layar + cetak via window.print()
"use client";

import { dateTimeId, PAYMENT_LABEL, rupiah } from "@/lib/format";
import { useStoreName } from "@/lib/store";
import type { Meta, Order } from "@/lib/types";

interface Mods {
  id: number;
  name: string;
  price: number;
}

export default function Receipt({ order, meta }: { order: Order; meta: Meta }) {
  const { store_name: poweredBy } = useStoreName();
  const items = order.items ?? [];
  return (
    <div className="receipt-print mx-auto w-full max-w-xs font-mono text-[11px] leading-5 text-slate-900">
      <div className="text-center">
        <p className="text-sm font-black tracking-tight">{meta.store_name}</p>
        <p className="text-slate-500">Point of Sale F&amp;B</p>
      </div>
      <div className="my-2 border-t border-dashed border-slate-400" />
      <div className="flex justify-between">
        <span>No</span>
        <span className="font-bold">{order.order_number}</span>
      </div>
      <div className="flex justify-between">
        <span>Waktu</span>
        <span>{dateTimeId(order.paid_at || order.created_at)}</span>
      </div>
      <div className="flex justify-between">
        <span>Kasir</span>
        <span>{order.cashier_name || "-"}</span>
      </div>
      <div className="flex justify-between">
        <span>Tipe</span>
        <span>
          {order.type === "dine-in" ? `Dine-in${order.table_name ? ` (${order.table_name})` : ""}` : order.type === "takeaway" ? "Bungkus" : "Delivery"}
        </span>
      </div>
      {order.customer_name && (
        <div className="flex justify-between">
          <span>Pelanggan</span>
          <span className="font-bold">{order.customer_name}</span>
        </div>
      )}
      {order.customer_phone && (
        <div className="flex justify-between">
          <span>Telepon</span>
          <span>{order.customer_phone}</span>
        </div>
      )}
      <div className="my-2 border-t border-dashed border-slate-400" />
      {items.map((it) => {
        const mods: Mods[] = (() => {
          try {
            return JSON.parse(it.modifiers || "[]");
          } catch {
            return [];
          }
        })();
        return (
          <div key={it.id} className="mb-1.5">
            <div className="flex justify-between font-semibold">
              <span>
                {it.qty}× {it.name}
              </span>
              <span>{rupiah(it.line_total)}</span>
            </div>
            {(mods.length > 0 || it.notes) && (
              <div className="pl-3 text-[10px] text-slate-500">
                {mods.map((m) => (
                  <div key={m.id} className="flex justify-between">
                    <span>+ {m.name}</span>
                    {m.price > 0 && <span>{rupiah(m.price)}</span>}
                  </div>
                ))}
                {it.notes && <div className="italic">“{it.notes}”</div>}
              </div>
            )}
          </div>
        );
      })}
      <div className="my-2 border-t border-dashed border-slate-400" />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{rupiah(order.subtotal)}</span>
      </div>
      {order.discount > 0 && (
        <div className="flex justify-between">
          <span>Diskon</span>
          <span>-{rupiah(order.discount)}</span>
        </div>
      )}
      {order.tax_amount > 0 && (
        <div className="flex justify-between">
          <span>Pajak ({order.tax_rate}%)</span>
          <span>{rupiah(order.tax_amount)}</span>
        </div>
      )}
      {order.service_amount > 0 && (
        <div className="flex justify-between">
          <span>Servis ({order.service_rate}%)</span>
          <span>{rupiah(order.service_amount)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between border-t border-slate-400 pt-1 text-sm font-black">
        <span>TOTAL</span>
        <span>{rupiah(order.total)}</span>
      </div>
      {order.payment_method === "cash" && (
        <>
          <div className="flex justify-between">
            <span>Tunai ({PAYMENT_LABEL.cash})</span>
            <span>{rupiah(order.paid_amount)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Kembali</span>
            <span>{rupiah(order.change_amount)}</span>
          </div>
        </>
      )}
      {order.payment_method && order.payment_method !== "cash" && (
        <div className="flex justify-between font-bold">
          <span>{PAYMENT_LABEL[order.payment_method]}</span>
          <span>{rupiah(order.total)}</span>
        </div>
      )}
      {order.notes && (
        <>
          <div className="my-2 border-t border-dashed border-slate-400" />
          <p className="italic">Catatan: {order.notes}</p>
        </>
      )}
      <div className="my-2 border-t border-dashed border-slate-400" />
      <p className="text-center">{meta.receipt_footer}</p>
      <p className="mt-1 text-center text-[9px] text-slate-400">Powered by {poweredBy}</p>
    </div>
  );
}
