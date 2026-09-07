export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando o painel de governança</span>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-40 animate-pulse rounded bg-n-100" />
        <div className="h-8 w-64 animate-pulse rounded bg-n-100" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-n-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface h-36 animate-pulse bg-n-0 p-5">
            <div className="h-3 w-24 rounded bg-n-100" />
            <div className="mt-6 h-9 w-16 rounded bg-n-100" />
            <div className="mt-4 h-3 w-40 rounded bg-n-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="surface h-64 animate-pulse lg:col-span-7" />
        <div className="surface h-64 animate-pulse lg:col-span-5" />
      </div>
    </div>
  );
}
