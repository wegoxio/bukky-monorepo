export type Tenant = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  is_active: boolean;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  public_email: string | null;
  tenant_logo_url?: string | null;
  tenant_favicon_url?: string | null;
};

export type TenantPage = {
  data: Tenant[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
};

export type CreateTenantPayload = {
  name: string;
  slug: string;
};

export type UpdateTenantPayload = Partial<CreateTenantPayload> & {
  is_active?: boolean;
  address_line?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  public_email?: string;
};

export type TenantFormState = {
  name: string;
  slug: string;
  is_active: boolean;
};

export const emptyForm: TenantFormState = {
  name: '',
  slug: '',
  is_active: true,
};

export interface TenantsTableProps {
  tenants: Tenant[];
  onEdit: (tenant: Tenant) => void;
  onDeactivate: (tenant: Tenant) => void;
}
