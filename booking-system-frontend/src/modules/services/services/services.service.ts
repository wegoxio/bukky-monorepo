import { apiFetch } from '@/modules/http/services/api';
import type {
  CreateServicePayload,
  Service,
  ToggleServiceStatusPayload,
  UpdateServicePayload,
} from '@/types/service.types';
import type { PaginatedResponse } from '@/types/pagination.types';

async function fetchAllServices(token: string): Promise<Service[]> {
  const first = await servicesService.findPage(token, 1);
  if (first.pagination.total_pages <= 1) return first.data;

  const remaining = await Promise.all(
    Array.from({ length: first.pagination.total_pages - 1 }, (_, index) =>
      servicesService.findPage(token, index + 2),
    ),
  );
  return [first, ...remaining].flatMap((page) => page.data);
}

export const servicesService = {
  findAll: async (token: string): Promise<Service[]> => {
    return fetchAllServices(token);
  },

  findPage: async (token: string, page = 1, q = ''): Promise<PaginatedResponse<Service>> => {
    const params = new URLSearchParams({ page: String(page), limit: '100' });
    if (q.trim()) params.set('q', q.trim());
    return apiFetch<PaginatedResponse<Service>>(`/services?${params}`, {
      method: 'GET',
      token,
    });
  },

  create: async (payload: CreateServicePayload, token: string): Promise<Service> => {
    return apiFetch<Service>('/services', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, payload: UpdateServicePayload, token: string): Promise<Service> => {
    return apiFetch<Service>(`/services/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },

  toggleStatus: async (
    id: string,
    payload: ToggleServiceStatusPayload,
    token: string,
  ): Promise<Service> => {
    return apiFetch<Service>(`/services/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },
};
