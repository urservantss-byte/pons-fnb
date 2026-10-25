// Halaman login — satu pintu untuk admin & kasir, design modern split-screen
"use client";

import { FormEvent, useState } from "react";
import { api, getAuth, homeFor, setAuth, setStoreInfo } from "@/lib/api";
import { useStoreName } from "@/lib/store";
import type { AuthUser, StoreInfo } from "@/lib/types";
import { ArrowRight } from "lucide-react";
import StoreLogo from "@/components/StoreLogo";

export default function LoginPage() {
  const store = useStoreName();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Kalau sudah login, langsung ke halaman sesuai role
  useState(() => {
    const auth = getAuth();
    if (auth) window.location.replace(homeFor(auth.user.role));
    return null;
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) return setError("Username dan password wajib diisi");
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token: string; user: AuthUser; store?: StoreInfo }>("/auth/login", {
        username,
        password,
      });
      setAuth({ token: res.token, user: res.user, store: res.store });
      if (res.store) setStoreInfo(res.store);
      window.location.replace(homeFor(res.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
      setLoading(false);
    }
  }

  function fillDemo(u: string, p: string) {
    setUsername(u);
    setPassword(p);
  }

  return (
    <main className="flex min-h-screen">
      {/* Panel kiri — branding + animasi */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-white lg:flex">
        {/* Blob ambient yang bergerak pelan */}
        <div aria-hidden className="absolute inset-0">
          <div className="login-blob absolute -left-1/4 top-[-15%] h-[70%] w-[80%] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.32),transparent_62%)] blur-3xl" />
          <div
            className="login-blob absolute bottom-[-20%] right-[-15%] h-[75%] w-[75%] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.26),transparent_62%)] blur-3xl"
            style={{ animationDelay: "-8s" }}
          />
          <div
            className="login-blob absolute left-1/3 top-1/3 h-[45%] w-[50%] rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.13),transparent_60%)] blur-3xl"
            style={{ animationDelay: "-4s" }}
          />
        </div>
        {/* Kilat menyapu tiap beberapa detik */}
        <div
          aria-hidden
          className="login-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
        />

        <div className="login-in relative flex items-center gap-3" style={{ animationDelay: "0.05s" }}>
          <StoreLogo size="size-11" icon="size-6" glow />
          <div>
            <p className="text-lg font-black tracking-tight">{store.store_name}</p>
            <p className="text-xs text-zinc-400">{store.tagline}</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="login-in mb-4 text-4xl font-black leading-tight tracking-tight" style={{ animationDelay: "0.2s" }}>
            Kasir cepat.
            <br />
            Laporan tajam.
            <br />
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Bisnis terkendali.
            </span>
          </h1>
          <p className="login-in max-w-md text-sm leading-6 text-zinc-400" style={{ animationDelay: "0.32s" }}>
            Satu sistem untuk mengelola menu, meja, shift kasir, pembayaran tunai/QRIS/kartu,
            stok real-time, dan laporan penjualan — khusus untuk restoran, kafe, dan kedai.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Dine-in", "Takeaway", "Delivery", "Multi Meja", "Modifier", "Laporan"].map((f, i) => (
              <span
                key={f}
                className="login-chip rounded-full border border-zinc-700/80 bg-zinc-900/60 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-amber-400/60 hover:bg-zinc-800/80 hover:text-amber-200"
                style={{ animationDelay: `${0.4 + i * 0.08}s, ${i * 0.45}s` }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="login-in relative flex items-center gap-2 text-xs text-zinc-500" style={{ animationDelay: "0.6s" }}>
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          Server lokal · Data tersimpan di SQLite
        </div>
      </div>

      {/* Panel kanan — form */}
      <div className="flex w-full flex-col justify-center bg-slate-50 px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-start gap-3 lg:hidden">
            <StoreLogo size="size-12" icon="size-6" />
            <div>
              <p className="text-xl font-black tracking-tight text-slate-900">{store.store_name}</p>
              <p className="text-xs text-slate-500">{store.tagline}</p>
            </div>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-slate-900">Selamat datang</h2>
          <p className="mt-1 mb-8 text-sm text-slate-500">Masuk untuk membuka kasir atau dashboard admin.</p>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="animate-pop rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cth: admin"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-zinc-700 border-t-transparent" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Masuk <ArrowRight className="size-4" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Akun demo — klik untuk isi
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("admin", "admin123")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-amber-400 hover:bg-amber-50"
              >
                <p className="text-sm font-bold text-slate-800">Admin</p>
                <p className="text-xs text-slate-500">admin / admin123</p>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("kasir", "kasir123")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-amber-400 hover:bg-amber-50"
              >
                <p className="text-sm font-bold text-slate-800">Kasir</p>
                <p className="text-xs text-slate-500">kasir / kasir123</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
