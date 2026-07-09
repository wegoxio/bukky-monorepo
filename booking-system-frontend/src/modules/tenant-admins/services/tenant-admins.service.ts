import { apiFetch } from '@/modules/http/services/api';
import type {
  CreateTenantAdminPayload,
  TenantAdmin,
  UpdateTenantAdminPayload,
} from '@/types/tenant-admin.types';
import type { PaginatedResponse } from '@/types/pagination.types';

async function fetchAllTenantAdmins(token: string): Promise<TenantAdmin[]> {
  const first = await tenantAdminsService.findPage(token, 1);
  if (first.pagination.total_pages <= 1) return first.data;

  const remaining = await Promise.all(
    Array.from({ length: first.pagination.total_pages - 1 }, (_, index) =>
      tenantAdminsService.findPage(token, index + 2),
    ),
  );
  return [first, ...remaining].flatMap((page) => page.data);
}

export const tenantAdminsService = {
  findAll: async (token: string): Promise<TenantAdmin[]> => {
    return fetchAllTenantAdmins(token);
  },

  findPage: async (token: string, page = 1, q = ''): Promise<PaginatedResponse<TenantAdmin>> => {
    const params = new URLSearchParams({ page: String(page), limit: '100' });
    if (q.trim()) params.set('q', q.trim());
    return apiFetch<PaginatedResponse<TenantAdmin>>(`/users/tenant-admins?${params}`, {
      method: 'GET',
      token,
    });
  },

  create: async (payload: CreateTenantAdminPayload, token: string): Promise<TenantAdmin> => {
    return apiFetch<TenantAdmin>('/users/tenant-admins', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  update: async (
    id: string,
    payload: UpdateTenantAdminPayload,
    token: string,
  ): Promise<TenantAdmin> => {
    return apiFetch<TenantAdmin>(`/users/tenant-admins/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },
};
