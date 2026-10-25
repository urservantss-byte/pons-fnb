// Loading halaman laporan — filter + KPI + dua panel chart
import { Skeleton, SkeletonPanel, SkeletonStats } from "@/components/Skeleton";

export default function ReportsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="space-y-6">
        <SkeletonStats />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SkeletonPanel className="h-80 xl:col-span-2" />
          <SkeletonPanel className="h-80" />
        </div>
        <SkeletonPanel className="h-64" />
      </div>
    </div>
  );
}
