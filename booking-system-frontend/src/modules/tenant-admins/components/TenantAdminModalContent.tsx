'use client';

import { ShieldCheck, UserRound } from 'lucide-react';
import { Avatar } from '@/modules/employees/components/components/Avatar';
import type { TenantAdminFormState } from '@/types/tenant-admin.types';
import type { Tenant } from '@/types/tenant.types';

interface TenantAdminModalContentProps {
  form: TenantAdminFormState;
  tenants: Tenant[];
  isEditing: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onTenantChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
}

export default function TenantAdminModalContent({
  form,
  tenants,
  isEditing,
  onNameChange,
  onEmailChange,
  onTenantChange,
  onIsActiveChange,
}: TenantAdminModalContentProps): React.ReactNode {
  const selectedTenantName =
    tenants.find((tenant) => tenant.id === form.tenant_id)?.name ?? 'el negocio seleccionado';

  return (
    <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="tenant-admin-name" className="text-sm font-medium text-fg-label">
            Nombre
          </label>
          <input
            id="tenant-admin-name"
            value={form.name}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            placeholder="Ej: Ana López"
            required
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tenant-admin-email" className="text-sm font-medium text-fg-label">
            Email
          </label>
          <input
            id="tenant-admin-email"
            type="email"
            value={form.email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            placeholder="admin@tenant.com"
            required
            maxLength={255}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tenant-admin-tenant" className="text-sm font-medium text-fg-label">
            Negocio
          </label>
          {isEditing ? (
            <div
              id="tenant-admin-tenant"
              className="w-full rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm text-fg"
            >
              {selectedTenantName}
            </div>
          ) : (
            <select
              id="tenant-admin-tenant"
              value={form.tenant_id}
              onChange={(event) => onTenantChange(event.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-fg"
              required
            >
              <option value="" disabled>
                Selecciona un negocio
              </option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          )}
        </div>

        {isEditing && (
          <label className="flex items-center gap-2 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-fg-label">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => onIsActiveChange(event.target.checked)}
            />
            Administrador activo
          </label>
        )}
      </div>

      <div className="space-y-4 rounded-[28px] border border-border bg-inverse-80 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={form.name || 'Nuevo Admin'} />
          <div>
            <p className="font-semibold text-fg-strong">{form.name.trim() || 'Nuevo Admin'}</p>
            <p className="text-sm text-muted">{form.email.trim() || 'admin@tenant.com'}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-border-soft bg-surface-panel-strong p-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-fg">
              <UserRound className="h-4 w-4 text-fg-icon" />
              Contexto del negocio
            </div>
            <p className="mt-2 text-sm text-muted">
              {form.tenant_id
                ? `Este administrador tendrá acceso sobre ${selectedTenantName}.`
                : 'Selecciona el negocio para asignar permisos.'}
            </p>
          </div>

          <div className="rounded-2xl border border-border-soft bg-surface-panel-strong p-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-fg">
              <ShieldCheck className="h-4 w-4 text-fg-icon" />
              Acceso seguro
            </div>
            <p className="mt-2 text-sm text-muted">
              {isEditing
                ? 'El cliente gestiona su propia contraseña. Si olvida el acceso, podrá recuperarlo por correo.'
                : 'Bukky no define la contraseña inicial. Se enviará un enlace para verificar el correo y completar el acceso.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
