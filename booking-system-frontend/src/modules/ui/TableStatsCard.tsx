export interface TableStatsCardProps {
  label: string;
  value: string | number;
}

export default function TableStatsCard({ label, value }: TableStatsCardProps): React.ReactNode {
  return (
    <div className="rounded-2xl border border-inverse-70 bg-inverse-80 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-fg-placeholder">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-fg-strong">{value}</p>
    </div>
  );
}
