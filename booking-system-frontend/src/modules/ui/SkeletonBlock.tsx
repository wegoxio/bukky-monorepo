export default function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-subtle ${className}`} />;
}
