// Sedap POS — sistem notifikasi toast ringan
'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const ToastCtx = createContext<(message: string, type?: ToastType) => void>(() => {})

export const useToast = () => useContext(ToastCtx)

const ICON: Record<ToastType, { icon: string; ring: string }> = {
  success: { icon: '✓', ring: 'bg-emerald-500' },
  error: { icon: '✕', ring: 'bg-red-500' },
  info: { icon: 'ℹ', ring: 'bg-sky-500' },
}

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setItems((prev) => [...prev, { id, message, type }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[999] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-rise pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur"
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${ICON[t.type].ring}`}
            >
              {ICON[t.type].icon}
            </span>
            <p className="text-sm font-medium text-slate-800">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
