'use client';

import { useAuth } from '@/context/AuthContext';
import { auditLogsService } from '@/modules/audit-logs/services/audit-logs.service';
import { employeesService } from '@/modules/employees/services/employees.service';
import { tenantsService } from '@/modules/tenants/services/tenants.service';
import CalendarDatePicker from '@/modules/ui/CalendarDatePicker';
import SelectField, { type SelectOption } from '@/modules/ui/SelectField';
import TableSkeleton from '@/modules/ui/TableSkeleton';
import TableStatsCard from '@/modules/ui/TableStatsCard';
import Avatar from '@/modules/ui/Avatar';
import type { AuditLogItem } from '@/types/audit-log.types';
import type { Employee } from '@/types/employee.types';
import type { Tenant } from '@/types/tenant.types';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Building2,
  CalendarClock,
  CalendarCheck2,
  CircleUserRound,
  FileCog,
  Filter,
  LockKeyhole,
  PencilLine,
  PlusCircle,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ACTION_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todas las acciones' },
  { value: 'AUTH_LOGIN_SUCCESS', label: 'Inicio de sesión correcto' },
  { value: 'TENANT_CREATED', label: 'Negocio creado' },
  { value: 'TENANT_UPDATED', label: 'Negocio actualizado' },
  { value: 'TENANT_ENABLED', label: 'Negocio habilitado' },
  { value: 'TENANT_DISABLED', label: 'Negocio deshabilitado' },
  { value: 'TENANT_DELETED', label: 'Negocio eliminado' },
  { value: 'TENANT_ADMIN_CREATED', label: 'Administrador creado' },
  { value: 'TENANT_ADMIN_UPDATED', label: 'Administrador actualizado' },
  { value: 'TENANT_ADMIN_ENABLED', label: 'Administrador habilitado' },
  { value: 'TENANT_ADMIN_DISABLED', label: 'Administrador deshabilitado' },
  { value: 'TENANT_ADMIN_DELETED', label: 'Administrador eliminado' },
  { value: 'EMPLOYEE_CREATED', label: 'Empleado creado' },
  { value: 'EMPLOYEE_UPDATED', label: 'Empleado actualizado' },
  { value: 'SERVICE_CREATED', label: 'Servicio creado' },
  { value: 'SERVICE_UPDATED', label: 'Servicio actualizado' },
  { value: 'SERVICE_ENABLED', label: 'Servicio habilitado' },
  { value: 'SERVICE_DISABLED', label: 'Servicio deshabilitado' },
  { value: 'EMPLOYEE_SCHEDULE_CREATED', label: 'Horario creado' },
  { value: 'EMPLOYEE_SCHEDULE_UPDATED', label: 'Horario actualizado' },
  { value: 'EMPLOYEE_TIME_OFF_CREATED', label: 'Bloqueo creado' },
  { value: 'EMPLOYEE_TIME_OFF_REMOVED', label: 'Bloqueo eliminado' },
  { value: 'BOOKING_CREATED', label: 'Cita creada' },
  { value: 'BOOKING_STATUS_UPDATED', label: 'Estado de cita actualizado' },
  { value: 'TENANT_SETTINGS_UPDATED', label: 'Configuración de negocio actualizada' },
  { value: 'TENANT_SETTINGS_ASSET_UPLOADED', label: 'Recurso de negocio subido' },
  { value: 'PLATFORM_SETTINGS_UPDATED', label: 'Configuración de plataforma actualizada' },
  { value: 'PLATFORM_SETTINGS_ASSET_UPLOADED', label: 'Recurso de plataforma subido' },
];

const ENTITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todas las entidades' },
  { value: 'auth', label: 'Autenticacion' },
  { value: 'tenant', label: 'Negocio' },
  { value: 'user', label: 'Usuario' },
  { value: 'employee', label: 'Empleado' },
  { value: 'service', label: 'Servicio' },
  { value: 'booking', label: 'Cita' },
  { value: 'tenant_settings', label: 'Configuracion de negocio' },
  { value: 'platform_settings', label: 'Configuracion de plataforma' },
];

const ACTION_OPTION_DETAILS: Record<
  string,
  Pick<SelectOption, 'label' | 'description' | 'icon'>
> = {
  '': { label: 'Todas las acciones', description: 'Cualquier evento registrado', icon: Activity },
  AUTH_LOGIN_SUCCESS: {
    label: 'Inicio de sesión correcto',
    description: 'Acceso autenticado',
    icon: LockKeyhole,
  },
  TENANT_CREATED: { label: 'Negocio creado', description: 'Alta de negocio', icon: Building2 },
  TENANT_UPDATED: {
    label: 'Negocio actualizado',
    description: 'Cambios de negocio',
    icon: PencilLine,
  },
  TENANT_ENABLED: {
    label: 'Negocio habilitado',
    description: 'Activación operativa',
    icon: PlusCircle,
  },
  TENANT_DISABLED: {
    label: 'Negocio deshabilitado',
    description: 'Desactivación operativa',
    icon: Trash2,
  },
  TENANT_DELETED: { label: 'Negocio eliminado', description: 'Baja de negocio', icon: Trash2 },
  TENANT_ADMIN_CREATED: {
    label: 'Administrador creado',
    description: 'Alta de administrador',
    icon: UserCog,
  },
  TENANT_ADMIN_UPDATED: {
    label: 'Administrador actualizado',
    description: 'Cambios de administrador',
    icon: PencilLine,
  },
  TENANT_ADMIN_ENABLED: {
    label: 'Administrador habilitado',
    description: 'Acceso reactivado',
    icon: PlusCircle,
  },
  TENANT_ADMIN_DISABLED: {
    label: 'Administrador deshabilitado',
    description: 'Acceso suspendido',
    icon: Trash2,
  },
  TENANT_ADMIN_DELETED: {
    label: 'Administrador eliminado',
    description: 'Baja de administrador',
    icon: Trash2,
  },
  EMPLOYEE_CREATED: {
    label: 'Empleado creado',
    description: 'Alta de profesional',
    icon: UserRound,
  },
  EMPLOYEE_UPDATED: {
    label: 'Empleado actualizado',
    description: 'Cambios de profesional',
    icon: PencilLine,
  },
  SERVICE_CREATED: { label: 'Servicio creado', description: 'Nuevo servicio', icon: Wrench },
  SERVICE_UPDATED: {
    label: 'Servicio actualizado',
    description: 'Cambios de servicio',
    icon: PencilLine,
  },
  SERVICE_ENABLED: {
    label: 'Servicio habilitado',
    description: 'Servicio visible',
    icon: PlusCircle,
  },
  SERVICE_DISABLED: {
    label: 'Servicio deshabilitado',
    description: 'Servicio pausado',
    icon: Trash2,
  },
  EMPLOYEE_SCHEDULE_CREATED: {
    label: 'Horario creado',
    description: 'Nueva disponibilidad',
    icon: CalendarClock,
  },
  EMPLOYEE_SCHEDULE_UPDATED: {
    label: 'Horario actualizado',
    description: 'Cambio de disponibilidad',
    icon: CalendarClock,
  },
  EMPLOYEE_TIME_OFF_CREATED: {
    label: 'Bloqueo creado',
    description: 'Ausencia o descanso',
    icon: CalendarClock,
  },
  EMPLOYEE_TIME_OFF_REMOVED: {
    label: 'Bloqueo eliminado',
    description: 'Ausencia retirada',
    icon: Trash2,
  },
  BOOKING_CREATED: { label: 'Cita creada', description: 'Nueva reserva', icon: CalendarCheck2 },
  BOOKING_STATUS_UPDATED: {
    label: 'Estado de cita actualizado',
    description: 'Cambio de estado',
    icon: PencilLine,
  },
  TENANT_SETTINGS_UPDATED: {
    label: 'Configuración de negocio actualizada',
    description: 'Ajustes del negocio',
    icon: Settings2,
  },
  TENANT_SETTINGS_ASSET_UPLOADED: {
    label: 'Recurso de negocio subido',
    description: 'Logo o favicon',
    icon: Upload,
  },
  PLATFORM_SETTINGS_UPDATED: {
    label: 'Configuración de plataforma actualizada',
    description: 'Ajustes globales',
    icon: Settings2,
  },
  PLATFORM_SETTINGS_ASSET_UPLOADED: {
    label: 'Recurso de plataforma subido',
    description: 'Asset global',
    icon: Upload,
  },
};

const ENTITY_OPTION_DETAILS: Record<
  string,
  Pick<SelectOption, 'label' | 'description' | 'icon'>
> = {
  '': { label: 'Todas las entidades', description: 'Cualquier módulo', icon: FileCog },
  auth: { label: 'Autenticación', description: 'Login y sesión', icon: ShieldCheck },
  tenant: { label: 'Negocio', description: 'Cuenta de negocio', icon: Building2 },
  user: { label: 'Usuario', description: 'Administradores', icon: CircleUserRound },
  employee: { label: 'Empleado', description: 'Profesionales', icon: UserRound },
  service: { label: 'Servicio', description: 'Catálogo de servicios', icon: Wrench },
  booking: { label: 'Cita', description: 'Reservas y estados', icon: CalendarCheck2 },
  tenant_settings: {
    label: 'Configuración de negocio',
    description: 'Branding y apariencia',
    icon: Settings2,
  },
  platform_settings: {
    label: 'Configuración de plataforma',
    description: 'Ajustes globales',
    icon: Settings2,
  },
};

const ACTION_FILTER_OPTIONS: SelectOption[] = ACTION_OPTIONS.map((option) => ({
  ...option,
  ...(ACTION_OPTION_DETAILS[option.value] ?? {}),
}));

const ENTITY_FILTER_OPTIONS: SelectOption[] = ENTITY_OPTIONS.map((option) => ({
  ...option,
  ...(ENTITY_OPTION_DETAILS[option.value] ?? {}),
}));

const ENTITY_LABELS: Record<string, string> = {
  auth: 'Autenticación',
  tenant: 'Negocio',
  user: 'Usuario',
  employee: 'Empleado',
  service: 'Servicio',
  booking: 'Cita',
  tenant_settings: 'Configuración de negocio',
  platform_settings: 'Configuración de plataforma',
  employee_schedule: 'Horario de empleado',
  employee_time_off: 'Bloqueo de empleado',
};

function formatEntityLabel(entity: string | null) {
  if (!entity) return 'Sin entidad';
  return ENTITY_LABELS[entity] ?? entity.replaceAll('_', ' ');
}

const AUDIT_FIELD_LABELS: Record<string, string> = {
  name: 'nombre',
  email: 'correo',
  phone: 'teléfono',
  slug: 'URL pública',
  is_active: 'estado',
  duration_minutes: 'duración',
  buffer_before_minutes: 'margen antes de la cita',
  buffer_after_minutes: 'margen después de la cita',
  capacity: 'capacidad',
  min_capacity: 'capacidad mínima',
  max_capacity: 'capacidad máxima',
  min_party_size: 'mínimo de personas',
  max_party_size: 'máximo de personas',
  slot_capacity: 'cupos por horario',
  currency: 'moneda',
  price: 'precio',
  pricing_model: 'tipo de precio',
  sort_order: 'orden',
  requires_confirmation: 'confirmación requerida',
  min_notice_minutes: 'anticipación mínima',
  booking_window_days: 'ventana de reserva',
  theme: 'colores',
  themeMode: 'modo de apariencia',
  themeOverrides: 'personalización visual',
  branding: 'marca',
  logoUrl: 'logo',
  faviconUrl: 'favicon',
  avatar_url: 'foto',
};

const AUDIT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'pendiente',
  CONFIRMED: 'confirmada',
  IN_PROGRESS: 'en progreso',
  COMPLETED: 'completada',
  CANCELLED: 'cancelada',
  NO_SHOW: 'no asistió',
};

function getMetadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getUpdatedFieldLabels(metadata: Record<string, unknown> | null): string {
  const fields = Array.isArray(metadata?.updated_fields)
    ? metadata.updated_fields.filter((field): field is string => typeof field === 'string')
    : [];

  if (fields.length === 0) return 'detalles actualizados';

  const labels = fields
    .slice(0, 5)
    .map((field) => AUDIT_FIELD_LABELS[field] ?? field.replaceAll('_', ' '));

  const extraCount = fields.length - labels.length;
  return extraCount > 0 ? `${labels.join(', ')} y ${extraCount} más` : labels.join(', ');
}

function formatAssetType(metadata: Record<string, unknown> | null): string {
  const assetType = getMetadataString(metadata, 'asset_type');
  if (assetType === 'logo') return 'logo';
  if (assetType === 'favicon') return 'favicon';
  return 'recurso visual';
}

function resolveAuditDisplayMessage(log: AuditLogItem): string {
  const metadata = log.metadata ?? null;
  const name = getMetadataString(metadata, 'name');
  const email = getMetadataString(metadata, 'email');
  const status = getMetadataString(metadata, 'status');
  const statusLabel = status ? (AUDIT_STATUS_LABELS[status] ?? status.toLowerCase()) : null;
  const serviceCount = Array.isArray(metadata?.service_ids) ? metadata.service_ids.length : null;

  switch (log.action) {
    case 'AUTH_LOGIN_SUCCESS':
      return 'Inicio de sesión exitoso.';
    case 'AUTH_LOGIN_FAILED':
      return 'Intento de inicio de sesión fallido.';
    case 'AUTH_LOGIN_BLOCKED':
      return 'Inicio de sesión bloqueado por seguridad.';
    case 'AUTH_ACCOUNT_LOCKED':
      return 'Cuenta bloqueada temporalmente por intentos fallidos.';
    case 'AUTH_REFRESH_SUCCESS':
    case 'AUTH_REFRESH_DUPLICATE_REJECTED':
      return 'Sesión renovada correctamente.';
    case 'AUTH_REFRESH_FAILED':
      return 'No se pudo renovar la sesión.';
    case 'AUTH_REFRESH_REUSE_DETECTED':
      return 'Se detectó actividad sospechosa en la sesión y se cerraron las sesiones activas.';
    case 'AUTH_LOGOUT':
      return 'Sesión cerrada.';
    case 'AUTH_LOGOUT_ALL':
      return 'Todas las sesiones fueron cerradas.';
    case 'AUTH_EMAIL_VERIFIED':
      return 'Correo electrónico verificado correctamente.';
    case 'AUTH_ACCESS_SETUP_LINK_SENT':
      return 'Se envió un enlace para activar el acceso.';
    case 'AUTH_PASSWORD_RESET_REQUESTED':
      return 'Se solicitó un restablecimiento de contraseña.';
    case 'AUTH_PASSWORD_RESET_COMPLETED':
      return 'La contraseña fue restablecida.';
    case 'AUTH_TENANT_ADMIN_ONBOARDING_COMPLETED':
      return 'Administrador de negocio activado correctamente.';
    case 'AUTH_ONBOARDING_MODULE_COMPLETED':
      return 'Recorrido de onboarding completado.';
    case 'AUTH_ONBOARDING_PROGRESS_RESET':
      return 'Progreso de onboarding reiniciado.';

    case 'TENANT_CREATED':
      return `Negocio "${name ?? 'sin nombre'}" creado.`;
    case 'TENANT_UPDATED':
      return `Negocio actualizado: ${getUpdatedFieldLabels(metadata)}.`;
    case 'TENANT_ENABLED':
      return `Negocio "${name ?? 'sin nombre'}" habilitado.`;
    case 'TENANT_DISABLED':
      return `Negocio "${name ?? 'sin nombre'}" deshabilitado.`;
    case 'TENANT_DELETED':
      return `Negocio "${name ?? 'sin nombre'}" eliminado.`;

    case 'TENANT_ADMIN_CREATED':
      return `Administrador "${name ?? email ?? 'sin nombre'}" creado.`;
    case 'TENANT_ADMIN_INVITATION_SENT':
      return `Invitación enviada a ${email ?? 'un administrador'}.`;
    case 'TENANT_ADMIN_INVITATION_FAILED':
      return `No se pudo enviar la invitación a ${email ?? 'un administrador'}.`;
    case 'TENANT_ADMIN_EMAIL_CHANGED':
      return 'Correo del administrador actualizado. Se requiere activar el nuevo acceso.';
    case 'TENANT_ADMIN_UPDATED':
      return `Administrador actualizado: ${getUpdatedFieldLabels(metadata)}.`;
    case 'TENANT_ADMIN_ENABLED':
      return `Administrador "${name ?? 'sin nombre'}" habilitado.`;
    case 'TENANT_ADMIN_DISABLED':
      return `Administrador "${name ?? 'sin nombre'}" deshabilitado.`;
    case 'TENANT_ADMIN_DELETED':
      return `Administrador "${name ?? 'sin nombre'}" eliminado.`;

    case 'EMPLOYEE_CREATED':
      return `Profesional "${name ?? 'sin nombre'}" creado.`;
    case 'EMPLOYEE_UPDATED':
      return `Profesional actualizado: ${getUpdatedFieldLabels(metadata)}.`;

    case 'SERVICE_CREATED':
      return `Servicio "${name ?? 'sin nombre'}" creado.`;
    case 'SERVICE_UPDATED':
      return `Servicio actualizado: ${getUpdatedFieldLabels(metadata)}.`;
    case 'SERVICE_ENABLED':
      return `Servicio "${name ?? 'sin nombre'}" habilitado.`;
    case 'SERVICE_DISABLED':
      return `Servicio "${name ?? 'sin nombre'}" deshabilitado.`;

    case 'EMPLOYEE_SCHEDULE_CREATED':
      return 'Horario de profesional creado.';
    case 'EMPLOYEE_SCHEDULE_UPDATED':
      return 'Horario de profesional actualizado.';
    case 'EMPLOYEE_TIME_OFF_CREATED':
      return 'Bloqueo de agenda creado.';
    case 'EMPLOYEE_TIME_OFF_REMOVED':
      return 'Bloqueo de agenda eliminado.';

    case 'BOOKING_CREATED':
      return `Cita creada${serviceCount ? ` con ${serviceCount} servicio(s)` : ''}.`;
    case 'BOOKING_STATUS_UPDATED':
      return statusLabel
        ? `Estado de cita cambiado a ${statusLabel}.`
        : 'Estado de cita actualizado.';

    case 'TENANT_SETTINGS_UPDATED':
      return `Configuración del negocio actualizada: ${getUpdatedFieldLabels(metadata)}.`;
    case 'TENANT_SETTINGS_ASSET_UPLOADED':
      return `Se actualizó el ${formatAssetType(metadata)} del negocio.`;
    case 'PLATFORM_SETTINGS_UPDATED':
      return `Configuración de plataforma actualizada: ${getUpdatedFieldLabels(metadata)}.`;
    case 'PLATFORM_SETTINGS_ASSET_UPLOADED':
      return `Se actualizó el ${formatAssetType(metadata)} de la plataforma.`;

    default:
      return log.message
        .replaceAll('tenant', 'negocio')
        .replaceAll('Tenant', 'Negocio')
        .replaceAll('_', ' ');
  }
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getActionBadgeClass(action: string) {
  if (action.includes('DELETED') || action.includes('DISABLED')) {
    return 'bg-surface-danger text-danger border-border-danger';
  }
  if (action.includes('UPDATED') || action.includes('STATUS')) {
    return 'bg-surface-info text-info border-border-info';
  }
  if (
    action.includes('CREATED') ||
    action.includes('UPLOADED') ||
    action.includes('LOGIN') ||
    action.includes('ENABLED')
  ) {
    return 'bg-surface-success text-success border-border-success';
  }
  return 'bg-surface-warning-soft text-warning border-border-warning';
}

function getActionIcon(action: string): LucideIcon {
  if (action.includes('LOGIN')) return LockKeyhole;
  if (action.includes('DELETED') || action.includes('DISABLED')) return Trash2;
  if (action.includes('ENABLED')) return PlusCircle;
  if (action.includes('UPDATED') || action.includes('STATUS')) return PencilLine;
  if (action.includes('UPLOADED')) return Upload;
  if (action.includes('CREATED')) return PlusCircle;
  return Activity;
}

function getEntityIcon(entity: string | null): LucideIcon {
  switch (entity) {
    case 'auth':
      return ShieldCheck;
    case 'tenant':
      return Building2;
    case 'user':
      return CircleUserRound;
    case 'employee':
      return UserRound;
    case 'service':
      return Wrench;
    case 'booking':
      return CalendarCheck2;
    case 'tenant_settings':
    case 'platform_settings':
      return Settings2;
    case 'employee_schedule':
      return UserCog;
    default:
      return FileCog;
  }
}

function pickString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getInitials(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function resolveTenantAssetUrl(tenant: Tenant): string | null {
  return pickString(tenant.tenant_favicon_url) ?? pickString(tenant.tenant_logo_url);
}

function resolveActorImageUrl(log: AuditLogItem): string | null {
  const actor = log.actor as
    | (NonNullable<AuditLogItem['actor']> & {
        avatar_url?: string | null;
        image_url?: string | null;
        profile_image_url?: string | null;
        photo_url?: string | null;
      })
    | null;

  const fromActor =
    pickString(actor?.avatar_url) ??
    pickString(actor?.image_url) ??
    pickString(actor?.profile_image_url) ??
    pickString(actor?.photo_url);

  const metadata = log.metadata ?? {};
  const fromMetadata =
    pickString(metadata['actor_avatar_url']) ??
    pickString(metadata['actor_image_url']) ??
    pickString(metadata['avatar_url']);

  if (log.actor?.role === 'SUPER_ADMIN') {
    return '/bukky-logo.svg';
  }

  return fromActor ?? fromMetadata;
}
export default function AuditLogsManagement(): React.ReactNode {
  const logsRequestIdRef = useRef(0);
  const { token, user } = useAuth();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isTenantAdmin = user?.role === 'TENANT_ADMIN';

  const tenantOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: '',
        label: 'Todos los negocios',
        description: 'Incluye eventos globales y de negocios',
        icon: Building2,
      },
      ...tenants.map((tenant) => ({
        value: tenant.id,
        label: tenant.name,
        description: tenant.slug,
        imageUrl: resolveTenantAssetUrl(tenant),
        initials: getInitials(tenant.name),
      })),
    ],
    [tenants],
  );

  const employeeOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: '',
        label: 'Todos los empleados',
        description: 'Cualquier profesional',
        icon: UserRound,
      },
      ...employees.map((employee) => ({
        value: employee.id,
        label: employee.name,
        description: employee.email,
        imageUrl: employee.avatar_url,
        initials: getInitials(employee.name),
      })),
    ],
    [employees],
  );

  const tenantAssetsById = useMemo(
    () =>
      new Map(
        tenants.map((tenant) => [
          tenant.id,
          {
            imageUrl: resolveTenantAssetUrl(tenant),
            name: tenant.name,
          },
        ]),
      ),
    [tenants],
  );

  const loadFilterData = useCallback(async () => {
    if (!token || !user) return;
    setIsLoadingFilters(true);
    try {
      if (user.role === 'SUPER_ADMIN') {
        const tenantsData = await tenantsService.findAll(token);
        setTenants(tenantsData);
      } else {
        const employeesData = await employeesService.findAll(token);
        setEmployees(employeesData);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar filtros auxiliares.',
      );
    } finally {
      setIsLoadingFilters(false);
    }
  }, [token, user]);

  const loadLogs = useCallback(async () => {
    if (!token || !user) return;
    const requestId = ++logsRequestIdRef.current;
    setIsLoadingLogs(true);
    setErrorMessage('');

    try {
      const response = await auditLogsService.list(
        {
          q: searchQuery || undefined,
          action: actionFilter || undefined,
          entity: entityFilter || undefined,
          tenant_id: isSuperAdmin ? tenantFilter || undefined : undefined,
          employee_id: isTenantAdmin ? employeeFilter || undefined : undefined,
          date: dateFilter || undefined,
          date_from: dateFilter ? undefined : fromDateFilter || undefined,
          date_to: dateFilter ? undefined : toDateFilter || undefined,
          page,
          limit,
        },
        token,
      );

      if (requestId !== logsRequestIdRef.current) return;

      setLogs(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.total_pages);
    } catch (error) {
      if (requestId !== logsRequestIdRef.current) return;
      setLogs([]);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los logs.');
    } finally {
      if (requestId === logsRequestIdRef.current) setIsLoadingLogs(false);
    }
  }, [
    actionFilter,
    dateFilter,
    employeeFilter,
    entityFilter,
    fromDateFilter,
    isSuperAdmin,
    isTenantAdmin,
    limit,
    page,
    searchQuery,
    tenantFilter,
    toDateFilter,
    token,
    user,
  ]);

  useEffect(() => {
    void loadFilterData();
  }, [loadFilterData]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setActionFilter('');
    setEntityFilter('');
    setTenantFilter('');
    setEmployeeFilter('');
    setDateFilter('');
    setFromDateFilter('');
    setToDateFilter('');
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    actionFilter,
    entityFilter,
    tenantFilter,
    employeeFilter,
    dateFilter,
    fromDateFilter,
    toDateFilter,
  ]);

  return (
    <section data-tour="audit-logs-page" className="space-y-4">
      <div
        data-tour="audit-logs-header"
        className="rounded-[28px] border border-card-border bg-linear-to-br from-surface-warm to-surface-soft p-6 shadow-theme-soft"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-fg-strong">Logs</h2>
            <p className="mt-4 max-w-3xl text-sm text-muted">
              Trazabilidad completa de acciones críticas en plataforma, negocio y operaciones.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TableStatsCard label="Resultados" value={total} />
            <TableStatsCard label="Pagina" value={`${page}/${totalPages}`} />
          </div>
        </div>
      </div>

      <div
        data-tour="audit-logs-filters"
        className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-fg-strong">Filtros</h3>
            <p className="text-sm text-muted">
              Refina por acción, entidad, fecha y alcance operativo.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral"
          >
            <Filter className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-placeholder" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-fg outline-none transition focus:border-accent"
              placeholder="Buscar en acción, actor o mensaje..."
            />
          </label>

          <SelectField
            value={actionFilter}
            onValueChange={setActionFilter}
            options={ACTION_FILTER_OPTIONS}
          />

          <SelectField
            value={entityFilter}
            onValueChange={setEntityFilter}
            options={ENTITY_FILTER_OPTIONS}
          />

          <CalendarDatePicker
            value={dateFilter}
            onChange={setDateFilter}
            placeholder="Filtrar por día"
          />

          <CalendarDatePicker
            value={fromDateFilter}
            onChange={setFromDateFilter}
            placeholder="Desde"
          />

          <CalendarDatePicker value={toDateFilter} onChange={setToDateFilter} placeholder="Hasta" />

          {isSuperAdmin ? (
            <SelectField
              value={tenantFilter}
              onValueChange={setTenantFilter}
              options={tenantOptions}
              disabled={isLoadingFilters}
            />
          ) : null}

          {isTenantAdmin ? (
            <SelectField
              value={employeeFilter}
              onValueChange={setEmployeeFilter}
              options={employeeOptions}
              disabled={isLoadingFilters}
            />
          ) : null}
        </div>

        {errorMessage ? <p className="mt-3 text-sm text-danger">{errorMessage}</p> : null}
      </div>

      <div
        data-tour="audit-logs-results"
        className="rounded-[28px] border border-card-border bg-surface-panel p-5 shadow-theme-card"
      >
        {isLoadingLogs ? (
          <TableSkeleton />
        ) : logs.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-base font-medium text-fg">
              No hay eventos para los filtros aplicados.
            </p>
            <p className="mt-2 text-sm text-muted">
              Ajusta el rango de fechas o la acción para encontrar resultados.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {logs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                const EntityIcon = getEntityIcon(log.entity);
                const actionBadgeClass = getActionBadgeClass(log.action);
                const actorName = log.actor?.name ?? 'Sistema';
                const actorImageUrl = resolveActorImageUrl(log);
                const tenantAsset = log.tenant?.id ? tenantAssetsById.get(log.tenant.id) : null;
                const displayMessage = resolveAuditDisplayMessage(log);

                return (
                  <article
                    key={log.id}
                    className="rounded-3xl border border-border-soft bg-surface p-4 shadow-theme-row"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-fg">
                          <CalendarClock className="h-3.5 w-3.5 text-fg-soft" />
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${actionBadgeClass}`}
                      >
                        <ActionIcon className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-medium text-fg">{displayMessage}</p>

                    <div className="mt-3 space-y-2 rounded-2xl border border-border-soft bg-surface-soft p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={actorName} imageUrl={actorImageUrl} className="h-8 w-8" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg">{actorName}</p>
                          <p className="truncate text-xs text-muted">{log.actor?.email ?? '-'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-fg-secondary">
                        <Avatar
                          name={log.tenant?.name ?? 'Global'}
                          imageUrl={tenantAsset?.imageUrl ?? null}
                          className="h-6 w-6 text-[9px]"
                        />
                        <span>
                          {log.tenant?.name ?? 'Global'} ({log.tenant?.slug ?? '-'})
                        </span>
                      </div>

                      <p className="inline-flex items-center gap-2 text-xs font-medium text-fg">
                        <EntityIcon className="h-3.5 w-3.5 text-fg-soft" />
                        {formatEntityLabel(log.entity)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div data-tour="audit-logs-table" className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-325 border-separate border-spacing-y-3 text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className="px-4 pb-2 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Fecha
                      </span>
                    </th>
                    <th className="px-4 pb-2 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5" />
                        Evento
                      </span>
                    </th>
                    <th className="px-4 pb-2 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <CircleUserRound className="h-3.5 w-3.5" />
                        Actor
                      </span>
                    </th>
                    <th className="px-4 pb-2 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Negocio
                      </span>
                    </th>
                    <th className="px-4 pb-2 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <FileCog className="h-3.5 w-3.5" />
                        Entidad
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => {
                    const ActionIcon = getActionIcon(log.action);
                    const EntityIcon = getEntityIcon(log.entity);
                    const actionBadgeClass = getActionBadgeClass(log.action);
                    const actorName = log.actor?.name ?? 'Sistema';
                    const actorImageUrl = resolveActorImageUrl(log);
                    const tenantAsset = log.tenant?.id ? tenantAssetsById.get(log.tenant.id) : null;
                    const displayMessage = resolveAuditDisplayMessage(log);

                    return (
                      <tr key={log.id} className="text-primary shadow-theme-row">
                        <td className="rounded-l-3xl border-y border-l border-border-soft bg-surface px-4 py-4">
                          <p className="inline-flex items-center gap-1.5 font-medium text-fg">
                            <CalendarClock className="h-3.5 w-3.5 text-fg-soft" />
                            {formatDateTime(log.created_at)}
                          </p>
                        </td>

                        <td className="border-y border-border-soft bg-surface px-4 py-4">
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${actionBadgeClass}`}
                            >
                              <ActionIcon className="h-3.5 w-3.5" />
                            </span>
                            <div>
                              <p className="max-w-90 text-sm font-medium text-fg">
                                {displayMessage}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="border-y border-border-soft bg-surface px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={actorName} imageUrl={actorImageUrl} className="h-9 w-9" />
                            <div>
                              <p className="font-medium text-fg">{actorName}</p>
                              <p className="mt-1 text-xs text-muted">{log.actor?.email ?? '-'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="border-y border-border-soft bg-surface px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              name={log.tenant?.name ?? 'Global'}
                              imageUrl={tenantAsset?.imageUrl ?? null}
                              className="h-8 w-8 text-[10px]"
                            />
                            <div>
                              <p className="font-medium text-fg">{log.tenant?.name ?? 'Global'}</p>
                              <p className="mt-1 text-xs text-muted">{log.tenant?.slug ?? '-'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="border-y border-border-soft bg-surface px-4 py-4">
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-fg">
                            <EntityIcon className="h-4 w-4 text-fg-soft" />
                            {formatEntityLabel(log.entity)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div data-tour="audit-logs-pagination" className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted">
            Mostrando página {page} de {totalPages}.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || isLoadingLogs}
              className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || isLoadingLogs}
              className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
