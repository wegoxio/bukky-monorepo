export type User = {
  sub: string;
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN';
  tenant_id: string | null;
  is_active: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  } | null;
};
