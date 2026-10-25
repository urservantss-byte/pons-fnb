// Export Excel modern (ExcelJS) — multi-sheet, header berwarna, format Rupiah,
// zebra rows, freeze panes, autofilter, data-bar, total otomatis.
import ExcelJS from "exceljs";
import { db, getSettings } from "./db.js";

// ---------- Palet & gaya dasar ----------
const C = {
  dark: "FF18181B", // zinc-900 (header tabel)
  darker: "FF09090B",
  amber: "FFF59E0B",
  amberSoft: "FFFEF3C7",
  white: "FFFFFFFF",
  zebra: "FFF8FAFC", // slate-50
  soft: "FFF1F5F9", // slate-100
  border: "FFE2E8F0", // slate-200
  text: "FF0F172A", // slate-900
  sub: "FF64748B", // slate-500
  green: "FF10B981",
  greenSoft: "FFD1FAE5",
  red: "FFEF4444",
  redSoft: "FFFEE2E2",
};

const thin = { style: "thin", color: { argb: C.border } };
const BOX = { top: thin, left: thin, bottom: thin, right: thin };
const MONEY = '"Rp"#,##0';
const NUM = "#,##0";

const TYPE_LABEL = { "dine-in": "Makan di Tempat", takeaway: "Bawa Pulang", delivery: "Diantar" };
const PAY_LABEL = { cash: "Tunai", qris: "QRIS", debit: "Kartu Debit", credit: "Kartu Kredit" };

// ---------- Helper umum ----------
function titleBlock(ws, cols, title, subtitle) {
  ws.mergeCells(1, 1, 1, cols);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { name: "Calibri", size: 16, bold: true, color: { argb: C.text } };
  t.alignment = { vertical: "middle" };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, cols);
  const s = ws.getCell(2, 1);
  s.value = subtitle;
  s.font = { size: 10, italic: true, color: { argb: C.sub } };
  ws.getRow(2).height = 16;
}

// Header tabel: fill gelap + teks putih tebal
function tableHeader(ws, row, headers, startCol = 1) {
  headers.forEach((h, i) => {
    const c = ws.getCell(row, startCol + i);
    c.value = h;
    c.font = { bold: true, size: 10, color: { argb: C.white } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
    c.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center", wrapText: true };
    c.border = BOX;
  });
  ws.getRow(row).height = 22;
}

function styleDataCell(c, { money = false, num = false, center = false, zebra = false, bold = false } = {}) {
  c.font = { size: 10, bold, color: { argb: C.text } };
  c.border = BOX;
  c.alignment = { vertical: "middle", horizontal: center ? "center" : "left" };
  if (money) c.numFmt = MONEY;
  if (num) c.numFmt = NUM;
  if (zebra) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.zebra } };
}

function sectionLabel(ws, row, text, col = 1, span = 4) {
  ws.mergeCells(row, col, row, col + span - 1);
  const c = ws.getCell(row, col);
  c.value = text.toUpperCase();
  c.font = { size: 9, bold: true, color: { argb: C.sub }, charSpacing: 1 };
}

function widths(ws, map) {
  for (const [col, w] of Object.entries(map)) ws.getColumn(col).width = w;
}

const pctDelta = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100));

// ---------- Query data ----------
function fetchAll(fromTs, toTs) {
  const summary = db.prepare(`
    SELECT COUNT(*) AS orders_count, COALESCE(SUM(total),0) AS revenue,
      COALESCE(SUM(CASE WHEN payment_method='cash' THEN total END),0) AS cash_total,
      COALESCE(SUM(CASE WHEN payment_method='qris' THEN total END),0) AS qris_total,
      COALESCE(SUM(CASE WHEN payment_method='debit' THEN total END),0) AS debit_total,
      COALESCE(SUM(CASE WHEN payment_method='credit' THEN total END),0) AS credit_total,
      COALESCE(SUM(tax_amount + service_amount),0) AS tax_service
    FROM orders WHERE status='paid' AND paid_at BETWEEN ? AND ?
  `).get(fromTs, toTs);

  const items = db.prepare(`
    SELECT COALESCE(SUM(oi.qty),0) AS qty,
           COALESCE(SUM(oi.qty * COALESCE(p.cost,0)),0) AS cost
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.status='paid' AND o.paid_at BETWEEN ? AND ?
  `).get(fromTs, toTs);

  const byType = db.prepare(`
    SELECT o.type, COUNT(*) AS orders_count, SUM(o.total) AS revenue
    FROM orders o WHERE o.status='paid' AND o.paid_at BETWEEN ? AND ? GROUP BY o.type
  `).all(fromTs, toTs);

  const transactions = db.prepare(`
    SELECT o.order_number, o.created_at, o.type, o.table_name, o.subtotal, o.discount,
      o.tax_amount, o.service_amount, o.total, o.payment_method, o.status, u.name AS cashier,
      (SELECT GROUP_CONCAT(oi.qty || 'x ' || oi.name, '; ') FROM order_items oi WHERE oi.order_id = o.id) AS items
    FROM orders o JOIN users u ON u.id = o.user_id
    WHERE o.created_at BETWEEN ? AND ? ORDER BY o.id
  `).all(fromTs, toTs);

  const best = db.prepare(`
    SELECT oi.name, SUM(oi.qty) AS qty, SUM(oi.line_total) AS revenue, AVG(oi.unit_price) AS avg_price
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.status='paid' AND o.paid_at BETWEEN ? AND ?
    GROUP BY oi.name ORDER BY qty DESC LIMIT 20
  `).all(fromTs, toTs);

  const daily = db.prepare(`
    SELECT strftime('%Y-%m-%d', o.paid_at) AS date, COUNT(*) AS orders_count, SUM(o.total) AS revenue
    FROM orders o WHERE o.status='paid' AND o.paid_at BETWEEN ? AND ?
    GROUP BY date ORDER BY date
  `).all(fromTs, toTs);

  const hourly = db.prepare(`
    SELECT CAST(strftime('%H', o.paid_at) AS INTEGER) AS hour, COUNT(*) AS orders_count, SUM(o.total) AS revenue
    FROM orders o WHERE o.status='paid' AND o.paid_at BETWEEN ? AND ?
    GROUP BY hour ORDER BY hour
  `).all(fromTs, toTs);

  return { summary: { ...summary, items_sold: items.qty, est_cost: items.cost, est_profit: summary.revenue - summary.tax_service - items.cost, avg_order: summary.orders_count ? Math.round(summary.revenue / summary.orders_count) : 0 }, byType, transactions, best, daily, hourly };
}

// ---------- Workbook ----------
export async function buildSalesWorkbook({ from, to, fromTs, toTs }) {
  const d = fetchAll(fromTs, toTs);
  const s = getSettings();
  const storeName = s.store_name || "Sedap POS";
  const wb = new ExcelJS.Workbook();
  wb.creator = storeName;
  wb.created = new Date();
  const nowStr = new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });

  // ===== Sheet 1: Ringkasan =====
  const rs = wb.addWorksheet("Ringkasan", { properties: { tabColor: { argb: C.amber } } });
  widths(rs, { A: 22, B: 16, C: 3, D: 20, E: 16, F: 3, G: 20, H: 16, I: 3, J: 20, K: 16 });
  titleBlock(rs, 11, `${storeName} — Ringkasan Laporan Penjualan`, `Periode ${from} s/d ${to}  ·  Dibuat otomatis ${nowStr}`);

  // Kartu KPI (2x2 blok bergaya kartu)
  const kpis = [
    { label: "PENDAPATAN", value: d.summary.revenue, money: true, fill: C.amberSoft },
    { label: "TRANSAKSI LUNAS", value: d.summary.orders_count, fill: C.soft },
    { label: "RATA-RATA / ORDER", value: d.summary.avg_order, money: true, fill: C.soft },
    { label: "ESTIMASI LABA", value: d.summary.est_profit, money: true, fill: C.greenSoft },
  ];
  kpis.forEach((k, i) => {
    const col = 1 + i * 3;
    rs.mergeCells(4, col, 4, col + 1);
    const lab = rs.getCell(4, col);
    lab.value = k.label;
    lab.font = { size: 8.5, bold: true, color: { argb: C.sub } };
    lab.alignment = { horizontal: "center", vertical: "middle" };
    lab.fill = { type: "pattern", pattern: "solid", fgColor: { argb: k.fill } };

    rs.mergeCells(5, col, 5, col + 1);
    const val = rs.getCell(5, col);
    val.value = k.value;
    val.font = { size: 15, bold: true, color: { argb: C.text } };
    val.alignment = { horizontal: "center", vertical: "middle" };
    if (k.money) val.numFmt = MONEY;
    val.fill = { type: "pattern", pattern: "solid", fgColor: { argb: k.fill } };

    for (let r = 4; r <= 5; r++)
      for (let cc = col; cc <= col + 1; cc++) rs.getCell(r, cc).border = BOX;
  });
  rs.getRow(5).height = 26;

  let row = 7;
  sectionLabel(rs, row, "Metode Pembayaran", 1, 2);
  sectionLabel(rs, row, "Tipe Pesanan", 4, 2);
  tableHeader(rs, row + 1, ["Metode", "Total"], 1);
  tableHeader(rs, row + 1, ["Tipe", "Order", "Pendapatan"], 4);
  const pays = [
    ["Tunai", d.summary.cash_total],
    ["QRIS", d.summary.qris_total],
    ["Kartu Debit", d.summary.debit_total],
    ["Kartu Kredit", d.summary.credit_total],
  ];
  pays.forEach(([name, v], i) => {
    const z = i % 2 === 1;
    styleDataCell(rs.getCell(row + 2 + i, 1), { zebra: z });
    rs.getCell(row + 2 + i, 1).value = name;
    styleDataCell(rs.getCell(row + 2 + i, 2), { money: true, zebra: z });
    rs.getCell(row + 2 + i, 2).value = v;
  });
  d.byType.forEach((t, i) => {
    const z = i % 2 === 1;
    styleDataCell(rs.getCell(row + 2 + i, 4), { zebra: z });
    rs.getCell(row + 2 + i, 4).value = TYPE_LABEL[t.type] || t.type;
    styleDataCell(rs.getCell(row + 2 + i, 5), { num: true, center: true, zebra: z });
    rs.getCell(row + 2 + i, 5).value = t.orders_count;
    styleDataCell(rs.getCell(row + 2 + i, 6), { money: true, zebra: z });
    rs.getCell(row + 2 + i, 6).value = t.revenue;
  });

  const infoRow = row + 2 + Math.max(pays.length, d.byType.length) + 1;
  sectionLabel(rs, infoRow, "Info Periode", 1, 2);
  const infos = [
    ["Item terjual", d.summary.items_sold],
    ["Pajak + service", d.summary.tax_service],
    ["Estimasi HPP", d.summary.est_cost],
    ["Laba bersih estimasi", d.summary.est_profit],
  ];
  infos.forEach(([label, v], i) => {
    const r = infoRow + 1 + i;
    styleDataCell(rs.getCell(r, 1));
    rs.getCell(r, 1).value = label;
    styleDataCell(rs.getCell(r, 2), { money: i > 0, num: i === 0 });
    rs.getCell(r, 2).value = v;
  });

  // ===== Sheet 2: Transaksi =====
  const wt = wb.addWorksheet("Transaksi", { properties: { tabColor: { argb: "FF8B5CF6" } }, views: [{ state: "frozen", ySplit: 4 }] });
  widths(wt, { A: 19, B: 18, C: 15, D: 10, E: 13, F: 11, G: 11, H: 11, I: 14, J: 13, K: 10, L: 15, M: 46 });
  titleBlock(wt, 13, "Riwayat Transaksi", `${d.transactions.length} transaksi  ·  Periode ${from} s/d ${to}`);
  const HEADERS = ["No. Order", "Waktu", "Tipe", "Meja", "Subtotal", "Diskon", "Pajak", "Servis", "Total", "Metode", "Status", "Kasir", "Item"];
  tableHeader(wt, 4, HEADERS);

  const STATUS_FILL = { paid: C.greenSoft, open: C.amberSoft, void: C.soft };
  const STATUS_COLOR = { paid: "FF047857", open: "FFB45309", void: C.sub };
  d.transactions.forEach((o, i) => {
    const r = 5 + i;
    const zebra = i % 2 === 1;
    const vals = [
      { v: o.order_number, bold: true },
      { v: o.created_at, center: true },
      { v: TYPE_LABEL[o.type] || o.type, center: true },
      { v: o.table_name || "—", center: true },
      { v: o.subtotal, money: true },
      { v: o.discount, money: true },
      { v: o.tax_amount, money: true },
      { v: o.service_amount, money: true },
      { v: o.total, money: true, bold: true },
      { v: PAY_LABEL[o.payment_method] || "-", center: true },
      { v: o.status === "paid" ? "LUNAS" : o.status === "open" ? "TERBUKA" : "VOID", center: true },
      { v: o.cashier },
      { v: o.items || "" },
    ];
    vals.forEach((cell, j) => {
      const c = wt.getCell(r, j + 1);
      c.value = cell.v;
      styleDataCell(c, { money: cell.money, center: cell.center, zebra, bold: cell.bold });
      c.font = { ...c.font, size: j === 12 ? 9 : 10 };
      if (j === 12) c.alignment = { vertical: "middle", wrapText: true };
    });
    // Chip status berwarna
    const sc = wt.getCell(r, 11);
    sc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[o.status] || C.soft } };
    sc.font = { size: 9, bold: true, color: { argb: STATUS_COLOR[o.status] || C.text } };
  });

  // Baris TOTAL dengan formula hidup
  const last = 4 + d.transactions.length;
  const totalRow = last + 1;
  wt.getCell(totalRow, 4).value = "TOTAL";
  wt.getCell(totalRow, 4).font = { bold: true, size: 10, color: { argb: C.white } };
  wt.getCell(totalRow, 4).alignment = { horizontal: "right", vertical: "middle" };
  ["E", "F", "G", "H", "I"].forEach((col) => {
    const c = wt.getCell(`${col}${totalRow}`);
    c.value = { formula: `SUM(${col}5:${col}${last})` };
    c.numFmt = MONEY;
    c.font = { bold: true, size: 10, color: { argb: C.white } };
    c.alignment = { horizontal: "right", vertical: "middle" };
  });
  for (let cc = 1; cc <= 13; cc++) {
    const c = wt.getCell(totalRow, cc);
    c.border = BOX;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
  }
  wt.autoFilter = { from: { row: 4, column: 1 }, to: { row: last, column: 13 } };
  wt.pageSetup = { fitToPage: true, fitToWidth: 1, orientation: "landscape" };

  // ===== Sheet 3: Menu Terlaris =====
  const wb3 = wb.addWorksheet("Menu Terlaris", { properties: { tabColor: { argb: C.green } } });
  widths(wb3, { A: 6, B: 34, C: 10, D: 16, E: 16 });
  titleBlock(wb3, 5, "Menu Terlaris", `Peringkat berdasarkan jumlah terjual  ·  Periode ${from} s/d ${to}`);
  tableHeader(wb3, 4, ["#", "Menu", "Qty", "Pendapatan", "Rata-rata Harga"]);
  d.best.forEach((b, i) => {
    const r = 5 + i;
    const zebra = i % 2 === 1;
    const cells = [
      { v: i + 1, num: true, center: true },
      { v: b.name, bold: i < 3 },
      { v: b.qty, num: true, center: true },
      { v: b.revenue, money: true },
      { v: Math.round(b.avg_price), money: true },
    ];
    cells.forEach((cell, j) => {
      const c = wb3.getCell(r, j + 1);
      c.value = cell.v;
      styleDataCell(c, { money: cell.money, num: cell.num, center: cell.center, zebra, bold: cell.bold });
    });
  });
  if (d.best.length) {
    wb3.addConditionalFormatting({
      ref: `C5:C${4 + d.best.length}`,
      rules: [{ type: "dataBar", priority: 1, minLength: 0, maxLength: 100, cfvo: [{ type: "min" }, { type: "max" }], color: { argb: C.amber }, showValue: true }],
    });
    wb3.addConditionalFormatting({
      ref: `D5:D${4 + d.best.length}`,
      rules: [{ type: "dataBar", priority: 1, minLength: 0, maxLength: 100, cfvo: [{ type: "min" }, { type: "max" }], color: { argb: "FF8B5CF6" }, showValue: true }],
    });
  }

  // ===== Sheet 4: Harian =====
  const wd = wb.addWorksheet("Pendapatan Harian", { properties: { tabColor: { argb: "FF0EA5E9" } } });
  widths(wd, { A: 14, B: 12, C: 12, D: 16 });
  titleBlock(wd, 4, "Pendapatan Harian", `Periode ${from} s/d ${to}`);
  tableHeader(wd, 4, ["Tanggal", "Transaksi", "Item Info", "Pendapatan"]);
  const DAY_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  d.daily.forEach((x, i) => {
    const r = 5 + i;
    const zebra = i % 2 === 1;
    const day = DAY_ID[new Date(`${x.date}T00:00:00`).getDay()];
    const cells = [
      { v: `${x.date} (${day})` },
      { v: x.orders_count, num: true, center: true },
      { v: "-", center: true },
      { v: x.revenue, money: true },
    ];
    cells.forEach((cell, j) => {
      const c = wd.getCell(r, j + 1);
      c.value = cell.v;
      styleDataCell(c, { money: cell.money, num: cell.num, center: cell.center, zebra, bold: j === 3 });
    });
  });
  if (d.daily.length) {
    wd.addConditionalFormatting({
      ref: `D5:D${4 + d.daily.length}`,
      rules: [{ type: "dataBar", priority: 1, minLength: 0, maxLength: 100, cfvo: [{ type: "min" }, { type: "max" }], color: { argb: C.amber }, showValue: true }],
    });
  }

  // ===== Sheet 5: Per Jam =====
  const wh = wb.addWorksheet("Penjualan per Jam", { properties: { tabColor: { argb: C.red } } });
  widths(wh, { A: 10, B: 14, C: 16 });
  titleBlock(wh, 3, "Penjualan per Jam", "Jam ramai = momen terbaik untuk promosi / staf ekstra");
  tableHeader(wh, 4, ["Jam", "Order", "Pendapatan"]);
  d.hourly.forEach((x, i) => {
    const r = 5 + i;
    const zebra = i % 2 === 1;
    const cells = [
      { v: `${String(x.hour).padStart(2, "0")}:00`, center: true, bold: true },
      { v: x.orders_count, num: true, center: true },
      { v: x.revenue, money: true },
    ];
    cells.forEach((cell, j) => {
      const c = wh.getCell(r, j + 1);
      c.value = cell.v;
      styleDataCell(c, { money: cell.money, num: cell.num, center: cell.center, zebra, bold: cell.bold });
    });
  });
  if (d.hourly.length) {
    wh.addConditionalFormatting({
      ref: `C5:C${4 + d.hourly.length}`,
      rules: [{ type: "dataBar", priority: 1, minLength: 0, maxLength: 100, cfvo: [{ type: "min" }, { type: "max" }], color: { argb: "FF8B5CF6" }, showValue: true }],
    });
  }

  return wb;
}
