import SkeletonBlock from './SkeletonBlock';

export default function TableSkeleton() {
  return (
    <div className="rounded-[28px] border border-card-border bg-surface-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-10 w-40" />
      </div>

      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid animate-pulse gap-3 rounded-3xl border border-border-soft bg-surface p-4 md:grid-cols-[1.5fr_1fr_0.8fr_0.9fr_1fr]"
          >
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-14 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
