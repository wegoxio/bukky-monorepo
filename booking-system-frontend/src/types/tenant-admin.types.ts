export type TenantAdmin = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  role: 'TENANT_ADMIN';
  tenant_id: string;
  is_active: boolean;
  invited_at: string | null;
  email_verified_at: string | null;
  onboarding_completed_at: string | null;
  access_state: 'INVITED' | 'PENDING_SETUP' | 'ACTIVE';
  tenant: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  } | null;
};

export type CreateTenantAdminPayload = {
  name: string;
  email: string;
  tenant_id: string;
};

export type UpdateTenantAdminPayload = {
  name?: string;
  email?: string;
  is_active?: boolean;
};

export type TenantAdminFormState = {
  name: string;
  email: string;
  tenant_id: string;
  is_active: boolean;
};
