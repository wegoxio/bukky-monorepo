import type {
  CreateServicePayload,
  Service,
  ServiceFormState,
  UpdateServicePayload,
} from '@/types/service.types';

export const emptyServiceForm: ServiceFormState = {
  name: '',
  description: '',
  instructions: '',
  duration_minutes: 60,
  capacity: 1,
  min_capacity: 1,
  max_capacity: 1,
  min_party_size: 1,
  max_party_size: 1,
  slot_capacity: 1,
  pricing_model: 'FLAT',
  price: 0,
  currency: 'USD',
  employee_ids: [],
  is_active: true,
  requires_confirmation: false,
};

export function toCreateServicePayload(form: ServiceFormState): CreateServicePayload {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    instructions: form.instructions.trim() || undefined,
    duration_minutes: form.duration_minutes,
    capacity: form.slot_capacity,
    min_capacity: form.min_party_size,
    max_capacity: form.max_party_size,
    min_party_size: form.min_party_size,
    max_party_size: form.max_party_size,
    slot_capacity: form.slot_capacity,
    pricing_model: form.pricing_model,
    price: Number(form.price.toFixed(2)),
    currency: form.currency.trim().toUpperCase(),
    is_active: form.is_active,
    requires_confirmation: form.requires_confirmation,
    employee_ids: form.employee_ids,
  };
}

export function toUpdateServicePayload(form: ServiceFormState): UpdateServicePayload {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    instructions: form.instructions.trim() || undefined,
    duration_minutes: form.duration_minutes,
    capacity: form.slot_capacity,
    min_capacity: form.min_party_size,
    max_capacity: form.max_party_size,
    min_party_size: form.min_party_size,
    max_party_size: form.max_party_size,
    slot_capacity: form.slot_capacity,
    pricing_model: form.pricing_model,
    price: Number(form.price.toFixed(2)),
    currency: form.currency.trim().toUpperCase(),
    employee_ids: form.employee_ids,
    is_active: form.is_active,
    requires_confirmation: form.requires_confirmation,
  };
}

export function serviceToFormState(service: Service): ServiceFormState {
  return {
    name: service.name,
    description: service.description ?? '',
    instructions: service.instructions ?? '',
    duration_minutes: service.duration_minutes,
    capacity: service.max_capacity ?? service.capacity,
    min_capacity: service.min_capacity ?? 1,
    max_capacity: service.max_capacity ?? service.capacity,
    min_party_size: service.min_party_size ?? service.min_capacity ?? 1,
    max_party_size: service.max_party_size ?? service.max_capacity ?? service.capacity,
    slot_capacity: service.slot_capacity ?? service.capacity,
    pricing_model: service.pricing_model ?? 'FLAT',
    price: Number(service.price),
    currency: service.currency,
    employee_ids: service.employees.map((employee) => employee.id),
    is_active: service.is_active,
    requires_confirmation: service.requires_confirmation,
  };
}
