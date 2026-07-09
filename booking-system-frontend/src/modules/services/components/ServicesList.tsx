import { Clock3, DollarSign } from 'lucide-react';
import Avatar from '@/modules/ui/Avatar';
import { formatPrice } from '@/utils/format';
import type { ServicesListProps } from '@/types/service.types';

export function ServicesList({
  services,
  isTogglingId,
  onEdit,
  onToggleStatus,
}: ServicesListProps) {
  return (
    <div className="mt-4">
      <div className="space-y-3 md:hidden">
        {services.map((service) => {
          const employeeNames = service.employees.map((employee) => employee.name).join(', ');

          return (
            <article
              key={service.id}
              className="rounded-3xl border border-border-soft bg-surface p-4 shadow-theme-row"
            >
              <div className="space-y-1">
                <h4 className="font-semibold text-fg-strong">{service.name}</h4>
                <p className="text-xs text-muted">
                  {service.description || 'Sin descripcion adicional.'}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-fg-secondary">
                  <Clock3 className="h-3.5 w-3.5" />
                  {service.duration_minutes} min
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-success px-3 py-1.5 text-xs font-semibold text-success">
                  <DollarSign className="h-3.5 w-3.5" />
                  {service.currency} {formatPrice(service.price)}
                  {service.pricing_model === 'PER_PERSON' ? ' / persona' : ' / reserva'}
                </span>
                <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs text-fg-secondary">
                  {service.min_party_size}-{service.max_party_size} por reserva ·{' '}
                  {service.slot_capacity} plazas
                </span>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    service.is_active
                      ? 'bg-surface-success text-success'
                      : 'bg-surface-muted text-neutral'
                  }`}
                >
                  {service.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-border-soft bg-surface-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Empleados
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {service.employees.slice(0, 3).map((employee) => (
                      <Avatar
                        key={employee.id}
                        name={employee.name}
                        imageUrl={employee.avatar_url}
                      />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg-strong">
                      {employeeNames || 'Sin empleados asignados'}
                    </p>
                    <p className="text-xs text-muted">
                      {service.employees.length} asignado
                      {service.employees.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(service)}
                  className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onToggleStatus(service)}
                  disabled={isTogglingId === service.id}
                  className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover disabled:opacity-60"
                >
                  {isTogglingId === service.id
                    ? 'Actualizando...'
                    : service.is_active
                      ? 'Desactivar'
                      : 'Activar'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-215 border-separate border-spacing-y-3 text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="px-4 pb-2 font-medium">Nombre</th>
              <th className="px-4 pb-2 font-medium">Duración</th>
              <th className="px-4 pb-2 font-medium">Precio</th>
              <th className="px-4 pb-2 font-medium">Empleados</th>
              <th className="px-4 pb-2 font-medium">Estado</th>
              <th className="px-4 pb-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              const employeeNames = service.employees.map((employee) => employee.name).join(', ');

              return (
                <tr key={service.id} className="text-primary shadow-theme-row">
                  <td className="rounded-l-3xl border-y border-l border-border-soft bg-surface px-4 py-4">
                    <div className="space-y-1">
                      <div className="font-semibold text-fg-strong">{service.name}</div>
                      <p className="line-clamp-2 text-xs text-muted">
                        {service.description || 'Sin descripcion adicional.'}
                      </p>
                    </div>
                  </td>
                  <td className="border-y border-border-soft bg-surface px-4 py-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-fg-secondary">
                      <Clock3 className="h-3.5 w-3.5" />
                      {service.duration_minutes} min
                    </div>
                  </td>
                  <td className="border-y border-border-soft bg-surface px-4 py-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-surface-success px-3 py-1.5 text-xs font-semibold text-success">
                      <DollarSign className="h-3.5 w-3.5" />
                      {service.currency} {formatPrice(service.price)}
                      {service.pricing_model === 'PER_PERSON' ? ' / persona' : ' / reserva'}
                    </div>
                  </td>
                  <td className="border-y border-border-soft bg-surface px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {service.employees.slice(0, 3).map((employee) => (
                          <Avatar
                            key={employee.id}
                            name={employee.name}
                            imageUrl={employee.avatar_url}
                          />
                        ))}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg-strong">
                          {employeeNames || 'Sin empleados asignados'}
                        </p>
                        <p className="text-xs text-muted">
                          {service.employees.length} asignado
                          {service.employees.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="border-y border-border-soft bg-surface px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        service.is_active
                          ? 'bg-surface-success text-success'
                          : 'bg-surface-muted text-neutral'
                      }`}
                    >
                      {service.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="rounded-r-3xl border-y border-r border-border-soft bg-surface px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(service)}
                        className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(service)}
                        disabled={isTogglingId === service.id}
                        className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover disabled:opacity-60"
                      >
                        {isTogglingId === service.id
                          ? 'Actualizando...'
                          : service.is_active
                            ? 'Desactivar'
                            : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
