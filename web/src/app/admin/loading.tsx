// Loading default admin — skeleton generik (dashboard & halaman grid)
import { Skeleton, SkeletonCards, SkeletonPanel, SkeletonStats } from "@/components/Skeleton";

export default function AdminLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-6">
        <SkeletonStats />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SkeletonPanel className="h-72 xl:col-span-2" />
          <SkeletonPanel className="h-72" />
        </div>
        <SkeletonCards count={3} />
      </div>
    </div>
  );
}
