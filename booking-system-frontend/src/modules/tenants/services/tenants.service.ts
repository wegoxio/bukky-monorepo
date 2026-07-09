import { apiFetch } from '@/modules/http/services/api';
import type {
  CreateTenantPayload,
  Tenant,
  TenantPage,
  UpdateTenantPayload,
} from '@/types/tenant.types';

export const tenantsService = {
  findAll: async (token: string): Promise<Tenant[]> => {
    const response = await apiFetch<TenantPage>('/tenant?page=1&limit=100', {
      method: 'GET',
      token,
    });
    return response.data;
  },

  findPage: async (
    token: string,
    query: { page: number; limit: number; q?: string },
  ): Promise<TenantPage> => {
    const params = new URLSearchParams({
      page: String(query.page),
      limit: String(query.limit),
      ...(query.q ? { q: query.q } : {}),
    });
    return apiFetch<TenantPage>(`/tenant?${params}`, { method: 'GET', token });
  },

  create: async (payload: CreateTenantPayload, token: string): Promise<Tenant> => {
    return apiFetch<Tenant>('/tenant', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, payload: UpdateTenantPayload, token: string): Promise<Tenant> => {
    return apiFetch<Tenant>(`/tenant/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },

  getCurrent: async (token: string): Promise<Tenant> => {
    return apiFetch<Tenant>('/tenant/me', {
      method: 'GET',
      token,
    });
  },

  updateCurrent: async (payload: UpdateTenantPayload, token: string): Promise<Tenant> => {
    return apiFetch<Tenant>('/tenant/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },
};
