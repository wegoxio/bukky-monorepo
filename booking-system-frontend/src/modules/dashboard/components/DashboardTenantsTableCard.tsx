import Avatar from '@/modules/ui/Avatar';
import Card from '@/modules/ui/Card';
import StatusPill from '@/modules/ui/StatusPill';
import type { DashboardTenantsTableCardProps } from '@/types/dashboard.types';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { Building2, Users } from 'lucide-react';

export default function DashboardTenantsTableCard({
  role,
  currency,
  tenants = [],
  employees = [],
}: DashboardTenantsTableCardProps) {
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const hasRows = isSuperAdmin ? tenants.length > 0 : employees.length > 0;
  const title = isSuperAdmin ? 'Negocios' : 'Profesionales';
  const TitleIcon = isSuperAdmin ? Building2 : Users;

  return (
    <Card className="overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-[30px] font-semibold leading-none text-fg-strong">
          <TitleIcon className="h-5 w-5 text-accent" />
          {title}
        </h3>
      </div>

      <div className="space-y-3 md:hidden">
        {hasRows ? (
          isSuperAdmin ? (
            tenants.map((tenant) => (
              <article
                key={tenant.tenant_id}
                className="rounded-3xl border border-border-soft bg-surface-soft p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={tenant.tenant_name}
                      imageUrl={tenant.tenant_logo_url}
                      className="h-10 w-10 text-xs"
                    />
                    <div>
                      <p className="font-semibold text-primary">{tenant.tenant_name}</p>
                      <p className="text-xs text-fg-soft">{tenant.tenant_slug}</p>
                    </div>
                  </div>
                  <StatusPill
                    label={tenant.tenant_is_active ? 'Activo' : 'Inactivo'}
                    variant={tenant.tenant_is_active ? 'active' : 'inactive'}
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-border-soft bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-soft">
                    Administrador principal
                  </p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {tenant.primary_admin_name || 'Sin administrador'}
                  </p>
                  <p className="text-xs text-fg-soft">{tenant.primary_admin_email || '-'}</p>
                  <p className="mt-1 text-xs text-fg-soft">
                    {tenant.tenant_admins_count} administradores
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <p className="text-fg-soft">
                    Personal:{' '}
                    <span className="font-semibold text-primary">
                      {tenant.active_employees_count} / {tenant.total_employees_count}
                    </span>
                  </p>
                  <p className="text-fg-soft">
                    Citas:{' '}
                    <span className="font-semibold text-primary">{tenant.bookings_this_month}</span>
                  </p>
                  <p className="text-fg-soft">
                    Ingresos:{' '}
                    <span className="font-semibold text-primary">
                      {formatCurrency(tenant.revenue_this_month, currency)}
                    </span>
                  </p>
                </div>
              </article>
            ))
          ) : (
            employees.map((employee) => (
              <article
                key={employee.employee_id}
                className="rounded-3xl border border-border-soft bg-surface-soft p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={employee.employee_name} />
                    <div>
                      <p className="font-semibold text-primary">{employee.employee_name}</p>
                      <p className="text-xs text-fg-soft">{employee.employee_email}</p>
                    </div>
                  </div>
                  <StatusPill
                    label={employee.employee_is_active ? 'Activo' : 'Inactivo'}
                    variant={employee.employee_is_active ? 'active' : 'inactive'}
                  />
                </div>

                <p className="mt-3 text-sm text-primary">{employee.employee_email}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <p className="text-fg-soft">
                    Citas del mes:{' '}
                    <span className="font-semibold text-primary">
                      {employee.bookings_this_month}
                    </span>
                  </p>
                  <p className="text-fg-soft">
                    Ingresos:{' '}
                    <span className="font-semibold text-primary">
                      {formatCurrency(employee.revenue_this_month, currency)}
                    </span>
                  </p>
                  <p className="col-span-2 text-fg-soft">
                    Ultima cita:{' '}
                    <span className="font-medium text-primary">
                      {formatDateTime(employee.last_booking_at)}
                    </span>
                  </p>
                </div>
              </article>
            ))
          )
        ) : (
          <div className="rounded-2xl border border-border-soft bg-surface-soft px-4 py-6 text-center text-sm text-muted">
            No hay datos suficientes para mostrar esta tabla todavía.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border-soft bg-surface-soft md:block">
        <table className="min-w-190 w-full text-left">
          <thead className="border-b border-border-soft bg-surface-soft">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              {isSuperAdmin ? (
                <>
                  <th className="px-4 py-3">Negocio</th>
                  <th className="px-4 py-3">Administrador principal</th>
                  <th className="px-4 py-3">Personal</th>
                  <th className="px-4 py-3">Citas del mes</th>
                  <th className="px-4 py-3">Ingresos del mes</th>
                  <th className="px-4 py-3 text-right">Estado</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3">Profesional</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Citas del mes</th>
                  <th className="px-4 py-3">Ingresos del mes</th>
                  <th className="px-4 py-3">Ultima cita</th>
                  <th className="px-4 py-3 text-right">Estado</th>
                </>
              )}
            </tr>
          </thead>
          {hasRows ? (
            <tbody>
              {isSuperAdmin
                ? tenants.map((tenant) => (
                    <tr
                      key={tenant.tenant_id}
                      className="border-b border-border-soft text-sm text-neutral last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={tenant.tenant_name} imageUrl={tenant.tenant_logo_url} />
                          <div>
                            <p className="font-semibold text-primary">{tenant.tenant_name}</p>
                            <p className="text-[10px] text-fg-soft">{tenant.tenant_slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-primary">
                            {tenant.primary_admin_name || 'Sin administrador'}
                          </p>
                          <p className="text-[10px] text-fg-soft">
                            {tenant.primary_admin_email || '-'}
                          </p>
                          <p className="text-[10px] text-fg-soft">
                            {tenant.tenant_admins_count} administradores
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base font-semibold text-primary">
                          {tenant.active_employees_count}
                        </span>{' '}
                        <span className="text-xs text-fg-soft">
                          / {tenant.total_employees_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base font-semibold text-primary">
                          {tenant.bookings_this_month}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base font-semibold text-primary">
                          {formatCurrency(tenant.revenue_this_month, currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusPill
                          label={tenant.tenant_is_active ? 'Activo' : 'Inactivo'}
                          variant={tenant.tenant_is_active ? 'active' : 'inactive'}
                        />
                      </td>
                    </tr>
                  ))
                : employees.map((employee) => (
                    <tr
                      key={employee.employee_id}
                      className="border-b border-border-soft text-sm text-neutral last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={employee.employee_name} />
                          <div>
                            <p className="font-semibold text-primary">{employee.employee_name}</p>
                            <p className="text-[10px] text-fg-soft">{employee.employee_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-primary">{employee.employee_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base font-semibold text-primary">
                          {employee.bookings_this_month}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base font-semibold text-primary">
                          {formatCurrency(employee.revenue_this_month, currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-fg-soft">
                          {formatDateTime(employee.last_booking_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusPill
                          label={employee.employee_is_active ? 'Activo' : 'Inactivo'}
                          variant={employee.employee_is_active ? 'active' : 'inactive'}
                        />
                      </td>
                    </tr>
                  ))}
            </tbody>
          ) : (
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                  No hay datos suficientes para mostrar esta tabla todavía.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </Card>
  );
}
