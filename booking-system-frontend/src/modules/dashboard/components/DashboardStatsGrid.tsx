import Card from '@/modules/ui/Card';
import type { DashboardMetric } from '@/types/dashboard.types';
import {
  Activity,
  BadgeCheck,
  Building2,
  CalendarDays,
  DollarSign,
  ShieldUser,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type DashboardStatsGridProps = {
  metrics: DashboardMetric[];
};

const METRIC_ICON_BY_KEY: Record<string, LucideIcon> = {
  active_tenants: Building2,
  tenant_admins: ShieldUser,
  bookings_month: CalendarDays,
  bookings_today: CalendarDays,
  revenue_month: DollarSign,
  active_services: BadgeCheck,
  active_employees: UserCheck,
};

export default function DashboardStatsGrid({ metrics }: DashboardStatsGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const MetricIcon = METRIC_ICON_BY_KEY[metric.key] ?? Activity;
        const deltaColorClass =
          metric.delta && metric.delta.startsWith('-') ? 'text-danger' : 'text-success';

        return (
          <Card key={metric.label} className="min-h-28 p-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border-soft bg-surface-soft text-fg-soft">
                <MetricIcon className="h-3.5 w-3.5" />
              </span>
              <p>{metric.label}</p>
            </div>

            <div className="mt-1 flex items-end gap-2">
              <p className="text-[34px] font-semibold leading-none text-fg-strong">
                {metric.value}
              </p>
              {metric.delta ? (
                <span className={`mb-1 text-sm font-medium ${deltaColorClass}`}>
                  {metric.delta}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] text-fg-soft">{metric.hint}</p>
          </Card>
        );
      })}
    </div>
  );
}
