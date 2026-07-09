import { apiFetch } from '@/modules/http/services/api';
import type { ReportsOverviewQuery, ReportsOverviewResponse } from '@/types/report.types';

function toQueryString(query?: ReportsOverviewQuery): string {
  if (!query) return '';

  const params = new URLSearchParams();

  if (query.date_from) params.set('date_from', query.date_from);
  if (query.date_to) params.set('date_to', query.date_to);
  if (query.timezone) params.set('timezone', query.timezone);
  if (query.group_by) params.set('group_by', query.group_by);
  if (query.tenant_id) params.set('tenant_id', query.tenant_id);
  if (query.employee_id) params.set('employee_id', query.employee_id);
  if (query.service_id) params.set('service_id', query.service_id);
  if (query.source) params.set('source', query.source);
  if (query.status) params.set('status', query.status);
  if (query.top_limit) params.set('top_limit', String(query.top_limit));

  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export const reportsService = {
  getOverview: async (
    token: string,
    query?: ReportsOverviewQuery,
  ): Promise<ReportsOverviewResponse> => {
    return apiFetch<ReportsOverviewResponse>(`/reports/overview${toQueryString(query)}`, {
      method: 'GET',
      token,
    });
  },

  exportXlsx: async (token: string, query?: ReportsOverviewQuery): Promise<Blob> => {
    return apiFetch<Blob>(`/reports/export${toQueryString(query)}`, {
      method: 'GET',
      token,
      responseType: 'blob',
    });
  },
};
