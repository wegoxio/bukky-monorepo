import { apiFetch } from '@/modules/http/services/api';
import type { ListAuditLogsQuery, ListAuditLogsResponse } from '@/types/audit-log.types';

function toQueryString(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || value.trim().length === 0) return;
    searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const auditLogsService = {
  list: async (query: ListAuditLogsQuery, token: string): Promise<ListAuditLogsResponse> => {
    const queryString = toQueryString({
      tenant_id: query.tenant_id,
      actor_user_id: query.actor_user_id,
      employee_id: query.employee_id,
      action: query.action,
      entity: query.entity,
      date: query.date,
      date_from: query.date_from,
      date_to: query.date_to,
      q: query.q,
      page: query.page ? String(query.page) : undefined,
      limit: query.limit ? String(query.limit) : undefined,
    });

    return apiFetch<ListAuditLogsResponse>(`/audit-logs${queryString}`, {
      method: 'GET',
      token,
    });
  },
};
