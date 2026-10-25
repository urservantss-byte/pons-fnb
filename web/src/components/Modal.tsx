// Modal reusable + guard klik backdrop
"use client";

import { ReactNode, useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // Kunci scroll halaman di belakang supaya fokus tetap ke modal
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === "sm" ? "sm:max-w-sm" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-lg";

  return (
    <div
      className="animate-fadein fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-start sm:p-4 sm:pt-[9vh]"
      style={{ top: 0, right: 0, bottom: 0, left: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Mobile: bottom-sheet naik dari bawah; desktop: panel menempel ke atas halaman */}
      <div className={`animate-pop flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[80vh] sm:rounded-2xl ${width}`}>
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-black text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
