import { ServiceFormState } from '@/types/service.types';
import { TenantFormState } from '@/types/tenant.types';
import { normalizeSlug } from './format';
import { TenantAdminFormState } from '@/types/tenant-admin.types';
import { EmployeeFormState } from '@/types/employee.types';
import { validateOptionalPhoneValue } from '@/modules/phone/utils/phone';

export function validateServiceForm(form: ServiceFormState): string | null {
  const normalizedName = form.name.trim();
  const normalizedCurrency = form.currency.trim().toUpperCase();
  const normalizedInstructions = form.instructions.trim();

  if (normalizedName.length < 1 || normalizedName.length > 120) {
    return 'El nombre debe tener entre 1 y 120 caracteres.';
  }
  if (!Number.isInteger(form.duration_minutes) || form.duration_minutes <= 0) {
    return 'La duración debe ser un entero positivo.';
  }
  if (!Number.isInteger(form.max_party_size) || form.max_party_size < 1) {
    return 'El máximo por reserva debe ser un entero positivo.';
  }
  if (!Number.isInteger(form.slot_capacity) || form.slot_capacity < form.max_party_size) {
    return 'La capacidad total debe ser mayor o igual al máximo por reserva.';
  }
  if (!Number.isFinite(form.price) || form.price < 0) {
    return 'El precio debe ser mayor o igual a 0.';
  }
  if (normalizedInstructions.length > 2000) {
    return 'Las instrucciones no pueden superar los 2000 caracteres.';
  }
  if (normalizedCurrency.length !== 3) {
    return 'La moneda debe tener 3 caracteres (ej. USD, EUR).';
  }
  if (form.employee_ids.length === 0) {
    return 'Debes asignar al menos 1 empleado al servicio.';
  }
  return null;
}

export function validateTenantCreateForm(form: TenantFormState): string | null {
  const normalizedName = form.name.trim();
  const normalizedSlug = normalizeSlug(form.slug);

  if (normalizedName.length < 1 || normalizedName.length > 120) {
    return 'El nombre debe tener entre 1 y 120 caracteres.';
  }

  if (normalizedSlug.length < 3 || normalizedSlug.length > 60) {
    return 'El slug debe tener entre 3 y 60 caracteres.';
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    return 'Slug inválido. Solo minúsculas, números y guiones.';
  }

  return null;
}

export function validateTenantAdminCreateForm(
  form: TenantAdminFormState,
  _isEditing: boolean,
): string | null {
  void _isEditing;
  const normalizedName = form.name.trim();
  const normalizedEmail = form.email.trim();

  if (normalizedName.length < 1 || normalizedName.length > 120) {
    return 'El nombre debe tener entre 1 y 120 caracteres.';
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return 'Debes ingresar un correo válido.';
  }

  if (!form.tenant_id) {
    return 'Debes asignar un negocio.';
  }

  return null;
}

export function validateEmployeeCreateForm(form: EmployeeFormState): string | null {
  const normalizedName = form.name.trim();
  const normalizedEmail = form.email.trim();

  if (normalizedName.length < 1 || normalizedName.length > 120) {
    return 'El nombre debe tener entre 1 y 120 caracteres.';
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return 'Debes ingresar un correo válido.';
  }

  const phoneValidationError = validateOptionalPhoneValue({
    countryIso2: form.phone_country_iso2,
    nationalNumber: form.phone_national_number,
    legacyDisplay: form.phone_legacy,
  });

  if (phoneValidationError) {
    return phoneValidationError;
  }

  return null;
}

export function isStrongPassword(value: string) {
  const requirements = getPasswordRequirementStatus(value);
  return Object.values(requirements).every(Boolean);
}

export type PasswordRequirementStatus = {
  minLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  symbol: boolean;
};

export function getPasswordRequirementStatus(value: string): PasswordRequirementStatus {
  return {
    minLength: value.length >= 8,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };
}
