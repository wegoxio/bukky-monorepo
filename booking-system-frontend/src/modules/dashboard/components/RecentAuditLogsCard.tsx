import { Check, ChevronDown, ClipboardList } from 'lucide-react';
import Avatar from '@/modules/ui/Avatar';
import Card from '@/modules/ui/Card';
import { RecentAuditLogsCardProps } from '@/types/dashboard.types';
import { formatRelativeTime } from '@/utils/format';

export default function RecentAuditLogsCard({
  title,
  logs,
  withRanges = false,
  withViewAll = false,
  compactSubtitle = false,
}: RecentAuditLogsCardProps) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-[30px] font-semibold leading-none text-fg-strong">
          <ClipboardList className="h-5 w-5 text-accent" />
          {title}
        </h3>

        {withRanges ? (
          <div className="flex items-center gap-1 rounded-lg border border-border-soft bg-surface-soft p-1 text-xs text-muted">
            <button className="rounded-md bg-surface px-2 py-1">30d</button>
            <button className="rounded-md px-2 py-1 hover:bg-surface">90d</button>
            <button className="rounded-md px-2 py-1 hover:bg-surface">YTD</button>
            <button className="rounded-md px-2 py-1 hover:bg-surface">1y</button>
            <button className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-surface">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {withViewAll ? (
          <button className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-neutral">
            Ver todo
            <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
          </button>
        ) : null}
      </div>

      {logs.length > 0 ? (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li
              key={log.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg py-1"
            >
              <Avatar name={log.actor_name || 'Sistema'} />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">{log.message}</p>
                <p className="truncate text-[10px] text-fg-soft">
                  {compactSubtitle
                    ? log.tenant_name || log.actor_email || log.actor_name || 'Sistema'
                    : `${log.actor_name || 'Sistema'}${log.tenant_name ? ` - ${log.tenant_name}` : ''}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-fg-soft">{formatRelativeTime(log.created_at)}</span>
                <Check className="h-3.5 w-3.5 text-success" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No hay eventos recientes para mostrar.</p>
      )}
    </Card>
  );
}
