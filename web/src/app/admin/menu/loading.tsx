// Loading halaman menu — bar cari + chip kategori + grid produk
import { Skeleton } from "@/components/Skeleton";

export default function MenuLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={`h-10 rounded-xl ${i === 0 ? "w-24" : "w-32"}`} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="flex size-12 items-center rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
