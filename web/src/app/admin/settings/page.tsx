// Admin — pengaturan toko, logo, pajak, servis, struk
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { api, assetUrl, getAuth, getStoreInfo, setAuth, setStoreInfo } from "@/lib/api";
import type { Meta } from "@/lib/types";
import { ImagePlus, Save, Soup, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/lib/toast";

export default function SettingsPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline] = useState("");
  const [footer, setFooter] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxPct, setTaxPct] = useState(0);
  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [servicePct, setServicePct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    api
      .get<Meta>("/catalog/meta")
      .then((m) => {
        setMeta(m);
        setStoreName(m.store_name);
        setTagline(m.tagline ?? "");
        setFooter(m.receipt_footer);
        setLogoUrl(m.logo_url ?? null);
        setTaxEnabled(m.rates.tax_enabled);
        setTaxPct(m.rates.tax_pct);
        setServiceEnabled(m.rates.service_enabled);
        setServicePct(m.rates.service_pct);
      })
      .catch((e) => toast(e instanceof Error ? e.message : "Gagal memuat", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        store_name: storeName,
        tagline,
        receipt_footer: footer,
        tax_enabled: taxEnabled,
        tax_pct: taxPct,
        service_enabled: serviceEnabled,
        service_pct: servicePct,
      });
      toast("Pengaturan disimpan");
      // Perbarui identitas toko di seluruh UI secara langsung (sidebar/kasir/login/struk)
      const info = { store_name: storeName, tagline: tagline || "Point of Sale F&B", logo_url: getStoreInfo()?.logo_url ?? logoUrl };
      setStoreInfo(info);
      const auth = getAuth();
      if (auth) setAuth({ ...auth, store: info });
      window.dispatchEvent(new CustomEvent("sedap:store-changed"));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onLogoPicked(file: File) {
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{ logo_url: string }>("/admin/branding/logo", fd, true);
      setLogoUrl(res.logo_url);
      const info = { store_name: storeName, tagline: tagline || "Point of Sale F&B", logo_url: res.logo_url };
      setStoreInfo(info);
      const auth = getAuth();
      if (auth) setAuth({ ...auth, store: info });
      window.dispatchEvent(new CustomEvent("sedap:store-changed"));
      toast("Logo diperbarui");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal mengunggah logo", "error");
    } finally {
      setLogoBusy(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  }

  async function onLogoRemove() {
    setLogoBusy(true);
    try {
      await api.del("/admin/branding/logo");
      setLogoUrl(null);
      const info = { store_name: storeName, tagline: tagline || "Point of Sale F&B", logo_url: null };
      setStoreInfo(info);
      const auth = getAuth();
      if (auth) setAuth({ ...auth, store: info });
      window.dispatchEvent(new CustomEvent("sedap:store-changed"));
      toast("Logo dihapus — kembali ke ikun bawaan");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menghapus logo", "error");
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Pengaturan" subtitle="Identitas toko, pajak, biaya layanan, dan struk" />

      <form onSubmit={onSubmit} className="grid max-w-3xl gap-6 lg:grid-cols-2">
        <div className="card space-y-5 p-6">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">Identitas Toko</h2>
          <div>
            <label className="label">Nama Toko</label>
            <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Tagline</label>
            <input
              className="input"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Point of Sale F&B"
            />
          </div>
          <div>
            <label className="label">Footer Struk</label>
            <textarea
              className="input min-h-20"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="Ucapan terima kasih di struk"
            />
          </div>
          <div>
            <label className="label">Logo Toko</label>
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 shadow-md shadow-amber-500/25">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(logoUrl) ?? undefined} alt="Logo toko" className="size-full object-cover" />
                ) : (
                  <Soup className="size-7 text-white" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onLogoPicked(f);
                  }}
                />
                <button type="button" className="btn-ghost" disabled={logoBusy} onClick={() => logoInput.current?.click()}>
                  <ImagePlus className="size-4" /> Unggah Logo
                </button>
                {logoUrl && (
                  <button type="button" className="btn-ghost text-red-600 hover:bg-red-50" disabled={logoBusy} onClick={onLogoRemove}>
                    <Trash2 className="size-4" /> Hapus
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">PNG/JPG/WebP/SVG, maksimal 2MB. Tampil di login, admin, kasir, dan halaman awal.</p>
          </div>
        </div>

        <div className="card space-y-5 p-6">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">Pajak &amp; Biaya Layanan</h2>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Pajak (PB1 / PPN)</p>
              <p className="text-xs text-slate-400">Dihitung dari subtotal setelah diskon</p>
            </div>
            <input
              type="checkbox"
              className="size-5 accent-amber-500"
              checked={taxEnabled}
              onChange={(e) => setTaxEnabled(e.target.checked)}
            />
          </label>
          {taxEnabled && (
            <div>
              <label className="label">Persentase Pajak (%)</label>
              <input
                type="number"
                min={0}
                max={50}
                className="input"
                value={taxPct}
                onChange={(e) => setTaxPct(Number(e.target.value))}
              />
            </div>
          )}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Biaya Layanan</p>
              <p className="text-xs text-slate-400">Servis charge (umum di restoran)</p>
            </div>
            <input
              type="checkbox"
              className="size-5 accent-amber-500"
              checked={serviceEnabled}
              onChange={(e) => setServiceEnabled(e.target.checked)}
            />
          </label>
          {serviceEnabled && (
            <div>
              <label className="label">Persentase Servis (%)</label>
              <input
                type="number"
                min={0}
                max={50}
                className="input"
                value={servicePct}
                onChange={(e) => setServicePct(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Menyimpan…" : <><Save className="size-4" /> Simpan Pengaturan</>}
          </button>
        </div>
      </form>
    </div>
  );
}
