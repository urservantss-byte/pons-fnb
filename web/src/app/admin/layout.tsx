// Layout Admin — sidebar light modern (icon lucide), guard auth role admin
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { clearAuth, getAuth } from "@/lib/api";
import { useStoreName } from "@/lib/store";
import type { AuthUser } from "@/lib/types";
import {
  Armchair,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Monitor,
  ReceiptText,
  Settings,
  Tags,
  Users,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react";
import StoreLogo from "@/components/StoreLogo";

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; mobileHide?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/reports", label: "Laporan", icon: LineChart },
  { href: "/admin/transactions", label: "Transaksi", icon: ReceiptText },
  { href: "/admin/menu", label: "Menu & Stok", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "Kategori", icon: Tags },
  { href: "/admin/modifiers", label: "Modifier", icon: Zap },
  { href: "/admin/tables", label: "Meja", icon: Armchair, mobileHide: true },
  { href: "/admin/users", label: "Pengguna", icon: Users },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  // Sidebar drawer mobile (lg ke atas sidebar selalu tampil)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const store = useStoreName();

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    if (auth.user.role !== "admin") {
      router.replace("/kasir");
      return;
    }
    setUser(auth.user);
    setReady(true);
  }, [router]);

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar — drawer di mobile (hidden), sidebar tetap di lg ke atas */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-[95] flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <StoreLogo />
          <div>
            <p className="truncate text-base font-black tracking-tight text-slate-900">{store.store_name}</p>
            <p className="text-[11px] font-semibold text-slate-400">Panel Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`${item.mobileHide ? "hidden lg:flex" : "flex"} items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-amber-50 text-amber-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-amber-600" : "text-slate-400"}`} />
                {item.label}
                {active && <span className="ml-auto size-1.5 rounded-full bg-amber-500" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <Link
            href="/kasir"
            className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-amber-400 hover:text-amber-700"
          >
            <Monitor className="size-3.5" /> Mode Kasir
          </Link>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
              {user?.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{user?.name}</p>
              <p className="text-[11px] font-medium text-slate-400">Administrator</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              title="Keluar"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Konten */}
      <main className="min-w-0 flex-1 overflow-x-hidden">
        {/* Header mobile (hamburger) — hilang di lg ke atas */}
        <header className="sticky top-0 z-40 flex items-center gap-2.5 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur lg:hidden">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Buka menu navigasi"
            className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100"
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <StoreLogo size="size-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black tracking-tight text-slate-900">{store.store_name}</p>
            <p className="text-[10px] font-semibold text-slate-400">Panel Admin</p>
          </div>
          <Link
            href="/kasir"
            aria-label="Mode Kasir"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-amber-700"
          >
            <Monitor className="size-5" />
          </Link>
          <button
            onClick={logout}
            aria-label="Keluar"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="size-5" />
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}
