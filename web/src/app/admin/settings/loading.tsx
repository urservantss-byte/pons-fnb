// Loading halaman pengaturan — form dua kolom
import { Skeleton } from "@/components/Skeleton";

function FormCard({ fields = 3 }: { fields?: number }) {
  return (
    <div className="card space-y-5 p-6">
      <Skeleton className="h-3 w-32" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid max-w-3xl gap-6 lg:grid-cols-2">
        <FormCard fields={2} />
        <FormCard fields={4} />
      </div>
    </div>
  );
}
