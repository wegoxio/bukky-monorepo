'use client';

import { Building2, ShieldCheck } from 'lucide-react';
import Avatar from '@/modules/ui/Avatar';
import type { TenantFormState } from '@/types/tenant.types';
import { normalizeSlug } from '@/utils/format';

interface TenantEditModalContentProps {
  form: TenantFormState;
  isEditing: boolean;
  inviteAdminEnabled: boolean;
  inviteAdminName: string;
  inviteAdminEmail: string;
  onNameChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
  onInviteAdminEnabledChange: (value: boolean) => void;
  onInviteAdminNameChange: (value: string) => void;
  onInviteAdminEmailChange: (value: string) => void;
}

export default function TenantEditModalContent({
  form,
  isEditing,
  inviteAdminEnabled,
  inviteAdminName,
  inviteAdminEmail,
  onNameChange,
  onIsActiveChange,
  onInviteAdminEnabledChange,
  onInviteAdminNameChange,
  onInviteAdminEmailChange,
}: TenantEditModalContentProps): React.ReactNode {
  return (
    <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="tenant-name" className="text-sm font-medium text-fg-label">
            Nombre
          </label>
          <input
            id="tenant-name"
            value={form.name}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            placeholder="Ej: Salon Central"
            required
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tenant-slug" className="text-sm font-medium text-fg-label">
            Slug
          </label>
          <input
            id="tenant-slug"
            value={form.slug}
            readOnly
            className="w-full cursor-not-allowed rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-sm text-neutral"
            placeholder="salon-central"
            required
            maxLength={60}
          />
        </div>

        {isEditing ? (
          <label className="flex items-center gap-2 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-fg-label">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => onIsActiveChange(event.target.checked)}
            />
            Negocio activo
          </label>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border-soft bg-surface px-4 py-4">
            <label className="flex items-center gap-2 text-sm font-medium text-fg-label">
              <input
                type="checkbox"
                checked={inviteAdminEnabled}
                onChange={(event) => onInviteAdminEnabledChange(event.target.checked)}
              />
              Invitar administrador ahora (opcional)
            </label>

            {inviteAdminEnabled ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="tenant-invite-admin-name" className="text-sm text-fg-label">
                    Nombre
                  </label>
                  <input
                    id="tenant-invite-admin-name"
                    value={inviteAdminName}
                    onChange={(event) => onInviteAdminNameChange(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
                    placeholder="Ej: Ana Lopez"
                    maxLength={120}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tenant-invite-admin-email" className="text-sm text-fg-label">
                    Email del administrador
                  </label>
                  <input
                    id="tenant-invite-admin-email"
                    type="email"
                    value={inviteAdminEmail}
                    onChange={(event) => onInviteAdminEmailChange(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
                    placeholder="admin@negocio.com"
                    maxLength={255}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-[28px] border border-border bg-inverse-80 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={form.name || 'Nuevo negocio'} />
          <div>
            <p className="font-semibold text-fg-strong">{form.name.trim() || 'Nuevo negocio'}</p>
            <p className="text-sm text-muted">{normalizeSlug(form.slug) || 'mi-negocio'}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-border-soft bg-surface-panel-strong p-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-fg">
              <Building2 className="h-4 w-4 text-fg-icon" />
              Identidad del negocio
            </div>
            <p className="mt-2 text-sm text-muted">
              El slug se usa como identificador estable para integraciones y enlaces.
            </p>
          </div>

          <div className="rounded-2xl border border-border-soft bg-surface-panel-strong p-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-fg">
              <ShieldCheck className="h-4 w-4 text-fg-icon" />
              Estado del negocio
            </div>
            <p className="mt-2 text-sm text-muted">
              {isEditing
                ? form.is_active
                  ? 'El negocio seguirá habilitado para iniciar sesión.'
                  : 'El negocio quedara inactivo para administradores.'
                : 'El negocio se creara como activo por defecto.'}
            </p>
          </div>

          {!isEditing ? (
            <div className="rounded-2xl border border-border-soft bg-surface-panel-strong p-4">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-fg">
                <ShieldCheck className="h-4 w-4 text-fg-icon" />
                Invitación al administrador
              </div>
              <p className="mt-2 text-sm text-muted">
                {inviteAdminEnabled
                  ? 'Al crear el negocio se intentará enviar la invitación al correo indicado.'
                  : 'Puedes crear solo el negocio y enviar invitaciones más tarde desde Admins de negocio.'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
