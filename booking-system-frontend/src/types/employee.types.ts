export type Employee = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string | null;
  phone_country_iso2: string | null;
  phone_national_number: string | null;
  phone_e164: string | null;
  avatar_url: string | null;
  avatar_key?: string | null;
  schedule_timezone?: string;
  slot_interval_minutes?: number;
  is_active: boolean;
};

export type CreateEmployeePayload = {
  name: string;
  email: string;
  phone?: string | null;
  phone_country_iso2?: string | null;
  phone_national_number?: string | null;
};

export type UpdateEmployeePayload = Partial<CreateEmployeePayload> & {
  is_active?: boolean;
};

export type EmployeeFormState = {
  name: string;
  email: string;
  phone_country_iso2: string;
  phone_national_number: string;
  phone_legacy: string;
  avatar_url: string | null;
  avatar_file: File | null;
  is_active: boolean;
};
