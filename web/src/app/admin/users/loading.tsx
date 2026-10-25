// Loading halaman pengguna — tabel
import { Skeleton, SkeletonTable } from "@/components/Skeleton";

export default function UsersLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
