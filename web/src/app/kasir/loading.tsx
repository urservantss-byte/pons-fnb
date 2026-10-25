// Loading kasir — katalog gelap + panel keranjang, meniru layout aslinya
import { Skeleton } from "@/components/Skeleton";

export default function KasirLoading() {
  return (
    <div className="flex min-h-[85vh]">
      {/* Katalog */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 px-5 py-3">
          <Skeleton className="h-10 w-64 rounded-xl" dark />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-xl" dark />
            ))}
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 content-start gap-3 p-5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="flex size-11 items-center rounded-xl" dark />
                <Skeleton className="h-3 w-10" dark />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-4/5" dark />
                <Skeleton className="h-3 w-1/2" dark />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Skeleton className="h-5 w-20" dark />
                <Skeleton className="h-3 w-12" dark />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Panel keranjang */}
      <aside className="flex w-[26rem] shrink-0 flex-col border-l border-zinc-800/80 bg-zinc-900/50 p-4">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[4.4rem] rounded-xl" dark />
          ))}
        </div>
        <div className="flex-1 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" dark />
                  <Skeleton className="h-3 w-1/3" dark />
                </div>
                <Skeleton className="size-6 rounded-lg" dark />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-7 w-24 rounded-lg" dark />
                <Skeleton className="h-4 w-20" dark />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-t border-zinc-800/80 pt-4">
          <Skeleton className="h-4 w-full" dark />
          <Skeleton className="h-4 w-3/4" dark />
          <Skeleton className="h-12 w-full rounded-xl" dark />
        </div>
      </aside>
    </div>
  );
}
