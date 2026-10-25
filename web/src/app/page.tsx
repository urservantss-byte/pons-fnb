// Halaman root: redirect sesuai role
"use client";

import { useEffect } from "react";
import { getAuth, homeFor } from "@/lib/api";
import { useStoreName } from "@/lib/store";
import StoreLogo from "@/components/StoreLogo";

export default function Home() {
  const store = useStoreName();
  useEffect(() => {
    const auth = getAuth();
    window.location.replace(auth ? homeFor(auth.user.role) : "/login");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <StoreLogo size="size-16" icon="size-8" rounded="rounded-2xl" />
        <div className="size-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-400" />
        <p className="text-sm font-medium text-zinc-400">Memuat {store.store_name}…</p>
      </div>
    </main>
  );
}
