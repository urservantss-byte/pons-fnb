// Sedap POS — upload + crop foto produk (square, via canvas — tanpa library)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, RotateCcw, Trash2, Upload } from "lucide-react";
import { assetUrl } from "@/lib/api";
import type { Product } from "@/lib/types";

const MAX_FILE = 2 * 1024 * 1024; // 2MB, sama seperti logo

type Box = { x: number; y: number; w: number; h: number };

export default function ProductPhotoInput({
  product,
  onSaved,
}: {
  /** Produk yang sedang diedit (null = produk baru, belum ada id → upload ditunda sampai tersimpan) */
  product: Product | null;
  onSaved: (p: Product) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const current = product?.photo_url ? assetUrl(product.photo_url) : null;

  // Saat file dipilih → muat ke canvas area crop
  const onPick = useCallback((f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|avif)$/.test(f.type)) {
      alert("Format harus PNG/JPG/WebP/AVIF");
      return;
    }
    if (f.size > MAX_FILE) {
      alert("Ukuran maksimal 2MB");
      return;
    }
    const url = URL.createObjectURL(f);
    setSrc(url);
    setBox({ x: 0, y: 0, w: 0, h: 0 }); // reset
  }, []);

  // Default kotak crop = persegi terbesar di tengah, saat gambar termuat
  const onImgLoad = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    const { naturalWidth: W, naturalHeight: H } = el;
    const side = Math.min(W, H);
    setBox({ x: (W - side) / 2, y: (H - side) / 2, w: side, h: side });
  }, []);

  // Panah keyboard menggeser crop 1% (lebih presisi daripada drag di HP)
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      const el = imgRef.current;
      if (!el || !box.w) return;
      e.preventDefault();
      const step = el.naturalWidth / 100;
      setBox((b) => {
        const W = el.naturalWidth,
          H = el.naturalHeight;
        let { x, y } = b;
        if (e.key === "ArrowLeft") x = Math.max(0, x - step);
        if (e.key === "ArrowRight") x = Math.min(W - b.w, x + step);
        if (e.key === "ArrowUp") y = Math.max(0, y - step);
        if (e.key === "ArrowDown") y = Math.min(H - b.h, y + step);
        return { ...b, x, y };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, box.w]);

  // Render preview crop pada overlay (posisi % → sesuai tampilan)
  const pct = {
    left: `${(box.x / (imgRef.current?.naturalWidth || 1)) * 100}%`,
    top: `${(box.y / (imgRef.current?.naturalHeight || 1)) * 100}%`,
    width: `${(box.w / (imgRef.current?.naturalWidth || 1)) * 100}%`,
    height: `${(box.h / (imgRef.current?.naturalHeight || 1)) * 100}%`,
  };

  // Geser kotak crop dengan pointer (mouse + sentuh)
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    const el = imgRef.current;
    if (!el) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: box.x, oy: box.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = imgRef.current;
    const d = dragRef.current;
    if (!el || !d || !box.w) return;
    const scale = el.naturalWidth / el.clientWidth;
    const W = el.naturalWidth,
      H = el.naturalHeight;
    let x = d.ox + (e.clientX - d.px) * scale;
    let y = d.oy + (e.clientY - d.py) * scale;
    x = Math.max(0, Math.min(W - box.w, x));
    y = Math.max(0, Math.min(H - box.h, y));
    setBox((b) => ({ ...b, x, y }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Potong square via canvas + kirim sebagai WebP (fallback PNG)
  async function savePhoto() {
    if (!imgRef.current || !box.w || !product) return;
    setSaving(true);
    try {
      const OUT = 512;
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak didukung browser");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imgRef.current, box.x, box.y, box.w, box.h, 0, 0, OUT, OUT);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/webp", 0.9)
      );
      const file = blob
        ? new File([blob], "photo.webp", { type: "image/webp" })
        : await canvasToPng();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/products/${product.id}/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getTok()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto");
      setSrc(null);
      onSaved(data as Product);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal mengunggah foto");
    } finally {
      setSaving(false);
    }
  }

  async function canvasToPng(): Promise<File> {
    const OUT = 512;
    const c = document.createElement("canvas");
    c.width = OUT;
    c.height = OUT;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(imgRef.current!, box.x, box.y, box.w, box.h, 0, 0, OUT, OUT);
    return new Promise((res, rej) =>
      c.toBlob(
        (b) => (b ? res(new File([b], "photo.png", { type: "image/png" })) : rej(new Error("Gagal memproses gambar"))),
        "image/png"
      )
    );
  }

  async function removePhoto() {
    if (!product?.photo_url) return;
    if (!confirm("Hapus foto produk ini? Kembali ke emoji.")) return;
    try {
      const res = await fetch(`/api/admin/products/${product.id}/photo`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getTok()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus foto");
      onSaved({ ...product, photo_url: null });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menghapus foto");
    }
  }

  function getTok(): string {
    try {
      return (JSON.parse(localStorage.getItem("sedap_auth") || "{}") as { token?: string }).token || "";
    } catch {
      return "";
    }
  }

  if (!product) {
    // Produk baru: upload ditunda sampai produk tersimpan (butuh id)
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Simpan produk dulu, lalu edit untuk menambah foto.
      </p>
    );
  }

  if (src) {
    // Mode crop
    return (
      <div className="space-y-3">
        <div className="relative select-none overflow-hidden rounded-xl bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="Pratinjau"
            onLoad={onImgLoad}
            className="mx-auto max-h-64 w-auto touch-none"
            draggable={false}
          />
          <div
            style={pct}
            className="pointer-events-none absolute border-2 border-amber-500 box-content"
          >
            <div className="absolute inset-0 bg-amber-500/10" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={savePhoto} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
            <Crop className="size-4" /> {saving ? "Menyimpan..." : "Simpan Hasil Crop"}
          </button>
          <button type="button" onClick={() => setSrc(null)} className="btn-ghost flex items-center gap-1.5 text-sm">
            <RotateCcw className="size-4" /> Batal
          </button>
          <p className="w-full text-[11px] text-slate-400">
            Geser kotak untuk memilih area (bisa pakai panah keyboard), lalu Simpan — otomatis persegi 512×512.
          </p>
        </div>
      </div>
    );
  }

  // Mode tampil: foto sekarang / emoji + tombol upload
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-2xl">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={product.name} className="size-full object-cover" />
        ) : (
          <span>{product.emoji}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost flex items-center gap-1.5 text-sm">
          <Upload className="size-4" /> {current ? "Ganti Foto" : "Upload Foto"}
        </button>
        {current && (
          <button type="button" onClick={removePhoto} className="btn-ghost flex items-center gap-1.5 text-sm text-red-600">
            <Trash2 className="size-4" /> Hapus
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = ""; // biar file sama bisa dipilih ulang
        }}
      />
    </div>
  );
}
