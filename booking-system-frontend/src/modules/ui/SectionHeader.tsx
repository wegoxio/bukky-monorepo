import TableStatsCard, { TableStatsCardProps } from './TableStatsCard';

interface SectionHeaderProps {
  headerTitle: string;
  headerDescription: string;
  stats: TableStatsCardProps[];
}

export default function SectionHeader({
  headerTitle,
  headerDescription,
  stats,
}: SectionHeaderProps): React.ReactNode {
  return (
    <div className="rounded-[28px] border border-card-border bg-gradient-to-br from-surface-warm to-surface-soft p-6 shadow-theme-soft">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-fg-strong">
            {headerTitle}
          </h2>
          <p className="mt-4 max-w-3xl text-sm text-muted">{headerDescription}</p>
        </div>

        <div className={`grid gap-3 sm:grid-cols-${stats.length}`}>
          {stats.map((stat) => (
            <TableStatsCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </div>
    </div>
  );
}
