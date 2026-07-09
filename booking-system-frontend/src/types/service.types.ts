import type { Employee } from './employee.types';

export type Service = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  capacity: number;
  min_capacity: number;
  max_capacity: number;
  min_party_size: number;
  max_party_size: number;
  slot_capacity: number;
  pricing_model: 'FLAT' | 'PER_PERSON';
  price: string;
  currency: string;
  is_active: boolean;
  sort_order: number;
  requires_confirmation: boolean;
  min_notice_minutes: number;
  booking_window_days: number;
  employees: Employee[];
};

export type CreateServicePayload = {
  name: string;
  description?: string;
  instructions?: string;
  duration_minutes: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  capacity?: number;
  min_capacity?: number;
  max_capacity?: number;
  min_party_size?: number;
  max_party_size?: number;
  slot_capacity?: number;
  pricing_model?: 'FLAT' | 'PER_PERSON';
  price: number;
  currency?: string;
  is_active?: boolean;
  sort_order?: number;
  requires_confirmation?: boolean;
  min_notice_minutes?: number;
  booking_window_days?: number;
  employee_ids: string[];
};

export type UpdateServicePayload = Partial<CreateServicePayload>;

export type ToggleServiceStatusPayload = {
  is_active: boolean;
};

export type ServiceFormState = {
  name: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  capacity: number;
  min_capacity: number;
  max_capacity: number;
  min_party_size: number;
  max_party_size: number;
  slot_capacity: number;
  pricing_model: 'FLAT' | 'PER_PERSON';
  price: number;
  currency: string;
  employee_ids: string[];
  is_active: boolean;
  requires_confirmation: boolean;
};

export type ServicesListProps = {
  services: Service[];
  isTogglingId: string | null;
  onEdit: (service: Service) => void;
  onToggleStatus: (service: Service) => void;
};
