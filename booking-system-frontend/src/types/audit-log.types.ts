export type AuditActor = {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN';
} | null;

export type AuditTenant = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
} | null;

export type AuditLogItem = {
  id: string;
  created_at: string;
  action: string;
  message: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  actor: AuditActor;
  tenant: AuditTenant;
};

export type ListAuditLogsQuery = {
  tenant_id?: string;
  actor_user_id?: string;
  employee_id?: string;
  action?: string;
  entity?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type ListAuditLogsResponse = {
  data: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};
