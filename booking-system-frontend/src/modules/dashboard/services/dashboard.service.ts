import { apiFetch } from '@/modules/http/services/api';
import type { DashboardOverviewQuery, DashboardOverviewResponse } from '@/types/dashboard.types';

function toQueryString(query?: DashboardOverviewQuery) {
  if (!query) return '';

  const params = new URLSearchParams();
  if (query.months) params.set('months', String(query.months));
  if (query.logs_limit) params.set('logs_limit', String(query.logs_limit));
  if (query.table_limit) params.set('table_limit', String(query.table_limit));
  if (query.currency) params.set('currency', query.currency);

  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export const dashboardService = {
  getOverview: async (
    token: string,
    query?: DashboardOverviewQuery,
  ): Promise<DashboardOverviewResponse> => {
    return apiFetch<DashboardOverviewResponse>(`/dashboard/overview${toQueryString(query)}`, {
      method: 'GET',
      token,
    });
  },
};
