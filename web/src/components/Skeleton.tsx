// Skeleton loading blocks — dipakai loading.tsx per-route & modal
export function Skeleton({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return <div aria-hidden className={`${dark ? "skeleton-dark" : "skeleton"} ${className}`} />;
}

const DARK_CARD = "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5";

export function SkeletonStats({ count = 4, dark = false }: { count?: number; dark?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${count > 2 ? "xl:grid-cols-4" : ""}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={dark ? DARK_CARD : "card space-y-3 p-5"}>
          <Skeleton className="h-3 w-24" dark={dark} />
          <Skeleton className="h-7 w-32" dark={dark} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({
  count = 6,
  dark = false,
  cols = "sm:grid-cols-2 xl:grid-cols-3",
  tall = false,
}: {
  count?: number;
  dark?: boolean;
  cols?: string;
  tall?: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={dark ? DARK_CARD : "card p-5"}>
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-xl" dark={dark} />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" dark={dark} />
              <Skeleton className="h-3 w-1/3" dark={dark} />
            </div>
          </div>
          {tall && <Skeleton className="mt-4 h-16 w-full" dark={dark} />}
        </div>
      ))}
    </div>
  );
}

const COL_W = ["w-24", "w-40", "w-20", "w-28", "w-16", "w-32", "w-24", "w-20", "w-16"];

export function SkeletonTable({ rows = 6, cols = 5, dark = false }: { rows?: number; cols?: number; dark?: boolean }) {
  const wrap = dark ? "rounded-2xl border border-zinc-800 bg-zinc-900/40" : "card overflow-hidden";
  const divide = dark ? "border-zinc-800" : "border-slate-50";
  return (
    <div className={wrap}>
      <div className={`flex items-center gap-6 border-b px-4 py-3 ${divide}`}>
        {COL_W.slice(0, cols).map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} dark={dark} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={`flex items-center gap-6 border-b px-4 py-3.5 last:border-0 ${divide}`}>
          <Skeleton className="size-8 shrink-0 rounded-full" dark={dark} />
          {COL_W.slice(0, cols).map((w, i) => (
            <Skeleton key={i} className={`h-4 ${(i + r) % 2 ? w : "w-28"}`} dark={dark} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div className={dark ? `rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 ${className}` : `card p-5 ${className}`}>
      <Skeleton className="mb-4 h-4 w-40" dark={dark} />
      <Skeleton className="h-full w-full" dark={dark} />
    </div>
  );
}
