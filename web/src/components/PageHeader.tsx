// Admin — header halaman reusable
"use client";

export default function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
      </div>
      {children && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{children}</div>}
    </div>
  );
}
