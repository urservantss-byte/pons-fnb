// StoreProvider — identitas toko global (nama + tagline) dari settings admin.
// Sumber: cache localStorage (token/login) → API publik /store → default bawaan.
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, DEFAULT_STORE, getStoreInfo, setStoreInfo } from "@/lib/api";
import type { StoreInfo } from "@/lib/types";

const StoreContext = createContext<StoreInfo>(DEFAULT_STORE);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<StoreInfo>(DEFAULT_STORE);

  useEffect(() => {
    setStore(getStoreInfo() ?? DEFAULT_STORE);
    api
      .get<StoreInfo>("/auth/store")
      .then((s) => {
        setStore(s);
        setStoreInfo(s);
        document.title = `${s.store_name} — ${s.tagline}`;
      })
      .catch(() => {});
    // Sinkron antar halaman/tab setelah admin menyimpan Pengaturan
    const onStoreChanged = () => {
      const s = getStoreInfo();
      if (s) {
        setStore(s);
        document.title = `${s.store_name} — ${s.tagline}`;
      }
    };
    window.addEventListener("sedap:store-changed", onStoreChanged);
    return () => window.removeEventListener("sedap:store-changed", onStoreChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

// Nama & tagline toko untuk UI — realtime mengikuti Pengaturan admin
export function useStoreName(): StoreInfo {
  return useContext(StoreContext);
}
