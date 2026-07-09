import { apiFetch } from '@/modules/http/services/api';
import type {
  CreateEmployeePayload,
  Employee,
  UpdateEmployeePayload,
} from '@/types/employee.types';
import type { PaginatedResponse } from '@/types/pagination.types';

async function fetchAllEmployees(token: string): Promise<Employee[]> {
  const first = await employeesService.findPage(token, 1);
  if (first.pagination.total_pages <= 1) return first.data;

  const remaining = await Promise.all(
    Array.from({ length: first.pagination.total_pages - 1 }, (_, index) =>
      employeesService.findPage(token, index + 2),
    ),
  );
  return [first, ...remaining].flatMap((page) => page.data);
}

export const employeesService = {
  findAll: async (token: string): Promise<Employee[]> => {
    return fetchAllEmployees(token);
  },

  findPage: async (token: string, page = 1, q = ''): Promise<PaginatedResponse<Employee>> => {
    const params = new URLSearchParams({ page: String(page), limit: '100' });
    if (q.trim()) params.set('q', q.trim());
    return apiFetch<PaginatedResponse<Employee>>(`/employees?${params}`, {
      method: 'GET',
      token,
    });
  },

  create: async (payload: CreateEmployeePayload, token: string): Promise<Employee> => {
    return apiFetch<Employee>('/employees', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, payload: UpdateEmployeePayload, token: string): Promise<Employee> => {
    return apiFetch<Employee>(`/employees/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },

  uploadAvatar: async (id: string, file: File, token: string): Promise<Employee> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<Employee>(`/employees/${id}/avatar`, {
      method: 'POST',
      token,
      body: formData,
    });
  },
};
