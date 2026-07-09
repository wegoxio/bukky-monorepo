import { Ban, Hash, Pencil } from 'lucide-react';
import { Avatar } from '@/modules/employees/components/components/Avatar';
import { formatDate } from '@/utils/format';
import { TenantsTableProps } from '@/types/tenant.types';

export default function TenantsTable({
  tenants,
  onEdit,
  onDeactivate,
}: TenantsTableProps): React.ReactNode {
  return (
    <div className="mt-4">
      <div className="space-y-3 md:hidden">
        {tenants.map((tenant) => (
          <article
            key={tenant.id}
            className="rounded-3xl border border-border-soft bg-surface p-4 shadow-theme-row"
          >
            <div className="flex items-center gap-3">
              <Avatar name={tenant.name} imageUrl={tenant.tenant_logo_url} />
              <div className="min-w-0">
                <p className="font-semibold text-fg-strong">{tenant.name}</p>
                <p className="text-xs text-muted">URL pública: {tenant.slug}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-fg-secondary">
                <Hash className="h-3.5 w-3.5" />
                {tenant.slug}
              </span>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  tenant.is_active
                    ? 'bg-surface-success text-success'
                    : 'bg-surface-muted text-neutral'
                }`}
              >
                {tenant.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <p className="mt-3 text-xs text-muted">Creado: {formatDate(tenant.created_at)}</p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onEdit(tenant)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDeactivate(tenant)}
                disabled={!tenant.is_active}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-warning bg-surface-warning px-3 py-2 text-xs font-medium text-warning transition-colors hover:bg-warning/60 hover:text-secondary-hover disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Ban className="h-3.5 w-3.5" />
                {tenant.is_active ? 'Desactivar' : 'Inactivo'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-220 border-separate border-spacing-y-3 text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="px-4 pb-2 font-medium">Negocio</th>
              <th className="px-4 pb-2 font-medium">Slug</th>
              <th className="px-4 pb-2 font-medium">Estado</th>
              <th className="px-4 pb-2 font-medium">Creado</th>
              <th className="px-4 pb-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="text-primary shadow-theme-row">
                <td className="rounded-l-3xl border-y border-l border-border-soft bg-surface px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={tenant.name} imageUrl={tenant.tenant_logo_url} />
                    <div className="min-w-0">
                      <p className="font-semibold text-fg-strong">{tenant.name}</p>
                      <p className="text-xs text-muted">URL pública: {tenant.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="border-y border-border-soft bg-surface px-4 py-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-fg-secondary">
                    <Hash className="h-3.5 w-3.5" />
                    {tenant.slug}
                  </div>
                </td>
                <td className="border-y border-border-soft bg-surface px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      tenant.is_active
                        ? 'bg-surface-success text-success'
                        : 'bg-surface-muted text-neutral'
                    }`}
                  >
                    {tenant.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="border-y border-border-soft bg-surface px-4 py-4">
                  <p className="text-fg-secondary">{formatDate(tenant.created_at)}</p>
                </td>
                <td className="rounded-r-3xl border-y border-r border-border-soft bg-surface px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(tenant)}
                      className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeactivate(tenant)}
                      disabled={!tenant.is_active}
                      className="inline-flex items-center gap-2 rounded-xl border border-border-warning bg-surface-warning px-3 py-2 text-xs font-medium text-warning transition-colors hover:bg-warning/60 hover:text-secondary-hover disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {tenant.is_active ? 'Desactivar' : 'Inactivo'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
