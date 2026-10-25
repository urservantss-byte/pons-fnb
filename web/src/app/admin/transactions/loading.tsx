// Loading halaman transaksi — bar filter + tabel besar
import { Skeleton, SkeletonTable } from "@/components/Skeleton";

export default function TransactionsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}
