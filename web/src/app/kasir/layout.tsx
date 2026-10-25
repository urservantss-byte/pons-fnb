// Layout Kasir — dark theme, guard auth (admin boleh masuk mode kasir)
"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAuth, getAuth, API_URL } from "@/lib/api";
import { useStoreName } from "@/lib/store";
import type { AuthUser } from "@/lib/types";
import { LayoutDashboard, LogOut, MonitorPlay } from "lucide-react";
import StoreLogo from "@/components/StoreLogo";

export default function CashierLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const router = useRouter();
  const store = useStoreName();

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setUser(auth.user);
    setReady(true);

    // Indikator koneksi API
    const check = () =>
      fetch(`${API_URL}/health`)
        .then(() => setOnline(true))
        .catch(() => setOnline(false));
    check();
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, [router]);

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="size-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Header kasir */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/60 px-3 backdrop-blur sm:gap-4 sm:px-5">
        <div className="flex items-center gap-3">
          <StoreLogo />
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-52 truncate text-sm font-black tracking-tight text-white">{store.store_name}</p>
            <p className="text-[10px] font-semibold text-zinc-500">Mode Kasir</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:ml-6">
          <Link
            href="/kasir"
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition sm:px-4 ${
              true ? "bg-amber-500/15 text-amber-300" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            <MonitorPlay className="size-4" /> Kasir
          </Link>
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 md:flex"
            >
              <LayoutDashboard className="size-4" /> Dashboard Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span
            className={`hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold ${
              online ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            <span className={`size-2 rounded-full ${online ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`} />
            {online ? "Terhubung" : "Terputus"}
          </span>
          <div className="flex items-center gap-3 rounded-xl bg-zinc-800/60 py-1.5 pl-2 pr-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-b from-amber-400 to-amber-500 text-sm font-bold text-zinc-950">
              {user?.name.charAt(0)}
            </div>
            <div>
              <p className="max-w-20 truncate text-xs font-bold text-zinc-100">{user?.name}</p>
              <p className="text-[10px] text-zinc-500">{user?.role === "admin" ? "Admin" : "Kasir"}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
              title="Keluar"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
