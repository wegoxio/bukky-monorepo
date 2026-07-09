'use client';

import { useAuth } from '@/context/AuthContext';
import { employeesService } from '@/modules/employees/services/employees.service';
import { reportsService } from '@/modules/reports/services/reports.service';
import { servicesService } from '@/modules/services/services/services.service';
import Avatar from '@/modules/ui/Avatar';
import CalendarDatePicker from '@/modules/ui/CalendarDatePicker';
import Card from '@/modules/ui/Card';
import SelectField, { type SelectOption } from '@/modules/ui/SelectField';
import type { Employee } from '@/types/employee.types';
import type {
  ReportBookingSource,
  ReportBookingStatus,
  ReportGroupBy,
  ReportsOverviewQuery,
  ReportsOverviewResponse,
} from '@/types/report.types';
import type { Service } from '@/types/service.types';
import {
  BarChart3,
  BellRing,
  Building2,
  CalendarDays,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Coins,
  DollarSign,
  Download,
  Euro,
  Globe2,
  Hand,
  LoaderCircle,
  ListFilter,
  Radio,
  RefreshCcw,
  TimerReset,
  UserX,
  Users,
  Wallet,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ReportsFiltersState = {
  date_from: string;
  date_to: string;
  group_by: ReportGroupBy;
  status: '' | ReportBookingStatus;
  source: '' | ReportBookingSource;
  employee_id: string;
  service_id: string;
  currency: string;
};

const REPORTS_FILTERS_STORAGE_KEY = 'bukky:reports:filters:v1';

const GROUP_BY_OPTIONS: SelectOption[] = [
  {
    value: 'day',
    label: 'Agrupar por día',
    description: 'Detalle diario',
    icon: CalendarDays,
  },
  {
    value: 'week',
    label: 'Agrupar por semana',
    description: 'Resumen semanal',
    icon: CalendarCheck2,
  },
  {
    value: 'month',
    label: 'Agrupar por mes',
    description: 'Resumen mensual',
    icon: CalendarCheck2,
  },
];

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  {
    value: '',
    label: 'Todos los estados',
    description: 'Incluye cualquier estado',
    icon: ListFilter,
  },
  {
    value: 'PENDING',
    label: 'Pendiente',
    description: 'Aún sin confirmar',
    icon: Clock3,
  },
  {
    value: 'CONFIRMED',
    label: 'Confirmada',
    description: 'Reserva aceptada',
    icon: CheckCircle2,
  },
  {
    value: 'IN_PROGRESS',
    label: 'En progreso',
    description: 'Cita en curso',
    icon: TimerReset,
  },
  {
    value: 'COMPLETED',
    label: 'Completada',
    description: 'Servicio finalizado',
    icon: CheckCircle2,
  },
  {
    value: 'CANCELLED',
    label: 'Cancelada',
    description: 'Reserva cancelada',
    icon: XCircle,
  },
  {
    value: 'NO_SHOW',
    label: 'No asistió',
    description: 'Cliente ausente',
    icon: UserX,
  },
];

const SOURCE_FILTER_OPTIONS: SelectOption[] = [
  {
    value: '',
    label: 'Todos los canales',
    description: 'Web y manual',
    icon: Radio,
  },
  {
    value: 'WEB',
    label: 'Web',
    description: 'Reserva pública online',
    icon: Globe2,
  },
  {
    value: 'MANUAL',
    label: 'Manual',
    description: 'Creada desde el panel',
    icon: Hand,
  },
];

type SummaryCard = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconToneClass: string;
};

function formatTenantLabel(input: {
  tenant_name: string | null;
  tenant_slug: string | null;
  tenant_id: string | null;
}): string {
  if (input.tenant_name) return input.tenant_name;
  if (input.tenant_slug) return input.tenant_slug;
  return 'Sin negocio';
}

function formatSourceLabel(source: string): string {
  switch (source) {
    case 'WEB':
      return 'Web';
    case 'ADMIN':
    case 'API':
    case 'MANUAL':
      return 'Manual';
    default:
      return source;
  }
}

function toDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange(): { date_from: string; date_to: string } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);

  return {
    date_from: toDateInput(start),
    date_to: toDateInput(today),
  };
}

function getDefaultReportsFilters(): ReportsFiltersState {
  return {
    ...getDefaultDateRange(),
    group_by: 'day',
    status: '',
    source: '',
    employee_id: '',
    service_id: '',
    currency: '',
  };
}

function loadStoredReportFilters(): ReportsFiltersState {
  const fallback = getDefaultReportsFilters();
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(REPORTS_FILTERS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ReportsFiltersState>;
    return {
      ...fallback,
      ...parsed,
      group_by: parsed.group_by ?? fallback.group_by,
      status: parsed.status ?? '',
      source: parsed.source ?? '',
      employee_id: parsed.employee_id ?? '',
      service_id: parsed.service_id ?? '',
      currency: parsed.currency ?? '',
    };
  } catch {
    return fallback;
  }
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getInitials(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function buildCurrencyOption(currency: string): SelectOption {
  switch (currency) {
    case 'USD':
      return {
        value: currency,
        label: currency,
        description: 'Dólar estadounidense',
        icon: DollarSign,
      };
    case 'EUR':
      return {
        value: currency,
        label: currency,
        description: 'Euro',
        icon: Euro,
      };
    case 'DOP':
      return {
        value: currency,
        label: currency,
        description: 'Peso dominicano',
        initials: 'RD$',
      };
    case 'MXN':
      return {
        value: currency,
        label: currency,
        description: 'Peso mexicano',
        initials: 'MX$',
      };
    case 'COP':
      return {
        value: currency,
        label: currency,
        description: 'Peso colombiano',
        initials: 'CO$',
      };
    default:
      return {
        value: currency,
        label: currency,
        description: 'Moneda del servicio',
        initials: currency.slice(0, 3).toUpperCase(),
      };
  }
}

function downloadBlob(input: { blob: Blob; fileName: string }) {
  const objectUrl = URL.createObjectURL(input.blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = input.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function ReportsManagement() {
  const overviewRequestIdRef = useRef(0);
  const { token, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [overview, setOverview] = useState<ReportsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const defaultFilters = useMemo(() => getDefaultReportsFilters(), []);
  const [filters, setFilters] = useState<ReportsFiltersState>(() => loadStoredReportFilters());

  const isTenantAdmin = user?.role === 'TENANT_ADMIN';
  const activeCurrency = overview?.filters.currency || filters.currency || 'USD';
  const currencyCodes = Array.from(
    new Set(['USD', 'EUR', 'DOP', 'MXN', 'COP', ...services.map((service) => service.currency)]),
  );
  const currencyOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: '',
        label: 'Divisa automática',
        description: 'Usa la moneda principal del reporte',
        icon: Coins,
      },
      ...currencyCodes.map(buildCurrencyOption),
    ],
    [currencyCodes],
  );
  const employeeOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: '',
        label: 'Todos los profesionales',
        description: 'Cualquier profesional',
        icon: Users,
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
  const serviceOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: '',
        label: 'Todos los servicios',
        description: 'Cualquier servicio activo',
        icon: Wrench,
      },
      ...services.map((service) => ({
        value: service.id,
        label: service.name,
        description: `${service.duration_minutes} min · ${service.currency} ${service.price}`,
        icon: Wrench,
      })),
    ],
    [services],
  );

  const buildQuery = useCallback((state: ReportsFiltersState): ReportsOverviewQuery => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    return {
      date_from: state.date_from,
      date_to: state.date_to,
      group_by: state.group_by,
      timezone: browserTimeZone,
      status: state.status || undefined,
      source: state.source || undefined,
      employee_id: state.employee_id || undefined,
      service_id: state.service_id || undefined,
      currency: state.currency || undefined,
      top_limit: 10,
    };
  }, []);

  const loadOverview = useCallback(
    async (state: ReportsFiltersState) => {
      if (!token) return;
      const requestId = ++overviewRequestIdRef.current;

      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await reportsService.getOverview(token, buildQuery(state));
        if (requestId !== overviewRequestIdRef.current) return;
        setOverview(data);
      } catch (error) {
        if (requestId !== overviewRequestIdRef.current) return;
        const message =
          error instanceof Error ? error.message : 'No se pudieron cargar los reportes.';
        setErrorMessage(message);
        toast.error(message);
      } finally {
        if (requestId === overviewRequestIdRef.current) setIsLoading(false);
      }
    },
    [buildQuery, token],
  );

  const loadReferenceData = useCallback(async () => {
    if (!token || !isTenantAdmin) {
      setEmployees([]);
      setServices([]);
      return;
    }

    setIsLoadingFilters(true);
    try {
      const [employeesData, servicesData] = await Promise.all([
        employeesService.findAll(token),
        servicesService.findAll(token),
      ]);

      setEmployees(employeesData.filter((employee) => employee.is_active));
      setServices(servicesData.filter((service) => service.is_active));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron cargar empleados y servicios.';
      toast.error(message);
    } finally {
      setIsLoadingFilters(false);
    }
  }, [isTenantAdmin, token]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(REPORTS_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    void loadOverview(filters);
    // Initial fetch only. Further fetches are triggered by filter submit or actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOverview]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    if (!overview) return [];

    return [
      {
        label: 'Citas',
        value: formatInteger(overview.summary.bookings_total),
        icon: CalendarCheck2,
        iconToneClass: 'bg-surface-info text-info',
      },
      {
        label: 'Ingresos',
        value: formatMoney(overview.summary.revenue_total_usd, activeCurrency),
        icon: DollarSign,
        iconToneClass: 'bg-surface-success text-success',
      },
      {
        label: 'Tasa de completados',
        value: formatRate(overview.summary.completion_rate),
        icon: CheckCircle2,
        iconToneClass: 'bg-surface-success text-success',
      },
      {
        label: 'Tasa de cancelaciones',
        value: formatRate(overview.summary.cancellation_rate),
        icon: XCircle,
        iconToneClass: 'bg-surface-danger text-danger',
      },
      {
        label: 'Tasa de inasistencia',
        value: formatRate(overview.summary.no_show_rate),
        icon: UserX,
        iconToneClass: 'bg-surface-warning text-warning',
      },
      {
        label: 'Ticket promedio',
        value: formatMoney(overview.summary.avg_ticket_usd, activeCurrency),
        icon: Wallet,
        iconToneClass: 'bg-surface-muted text-fg',
      },
    ];
  }, [activeCurrency, overview]);

  const showServiceTenantColumn = overview?.scope.role === 'SUPER_ADMIN';
  const hasActiveFilters =
    filters.date_from !== defaultFilters.date_from ||
    filters.date_to !== defaultFilters.date_to ||
    filters.group_by !== defaultFilters.group_by ||
    filters.status !== '' ||
    filters.source !== '' ||
    filters.employee_id !== '' ||
    filters.service_id !== '' ||
    filters.currency !== '';

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadOverview(filters);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    void loadOverview(defaultFilters);
  };

  const handleExport = async () => {
    if (!token) return;

    setIsExporting(true);
    const toastId = toast.loading('Preparando Excel...');
    try {
      const blob = await reportsService.exportXlsx(token, buildQuery(filters));
      downloadBlob({
        blob,
        fileName: `reportes-${filters.date_from}-a-${filters.date_to}.xlsx`,
      });
      toast.success('Descarga lista.', { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar el reporte.';
      toast.error(message, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section data-tour="reports-page" className="space-y-4">
      <div
        data-tour="reports-header"
        className="rounded-[28px] border border-card-border bg-gradient-to-br from-surface-warm to-surface-soft p-6 shadow-theme-soft"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-[-0.03em] text-fg-strong">
              <BarChart3 className="h-7 w-7 text-accent" />
              Reportes
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              Analiza el desempeño de citas, ingresos, canales y recordatorios con rango flexible y
              exportación a Excel.
            </p>
          </div>

          <div data-tour="reports-actions" className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadOverview(filters)}
              disabled={isLoading || !token}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg transition hover:bg-surface-soft disabled:opacity-60"
            >
              {isLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Actualizar
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isLoading || !overview}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-theme-accent transition hover:brightness-[0.98] disabled:opacity-60"
            >
              {isExporting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? 'Preparando Excel...' : 'Exportar Excel'}
            </button>
          </div>
        </div>

        <form
          data-tour="reports-filters"
          onSubmit={handleFilterSubmit}
          className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
        >
          <CalendarDatePicker
            value={filters.date_from}
            onChange={(value) => setFilters((current) => ({ ...current, date_from: value }))}
            placeholder="Desde"
            buttonClassName="h-11 rounded-2xl"
          />

          <CalendarDatePicker
            value={filters.date_to}
            onChange={(value) => setFilters((current) => ({ ...current, date_to: value }))}
            placeholder="Hasta"
            buttonClassName="h-11 rounded-2xl"
          />

          <SelectField
            value={filters.group_by}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                group_by: value as ReportGroupBy,
              }))
            }
            options={GROUP_BY_OPTIONS}
            triggerClassName="h-11 rounded-2xl"
          />

          <SelectField
            value={filters.status}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                status: value as ReportsFiltersState['status'],
              }))
            }
            options={STATUS_FILTER_OPTIONS}
            triggerClassName="h-11 rounded-2xl"
          />

          <SelectField
            value={filters.source}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                source: value as ReportsFiltersState['source'],
              }))
            }
            options={SOURCE_FILTER_OPTIONS}
            triggerClassName="h-11 rounded-2xl"
          />

          <SelectField
            value={filters.currency}
            onValueChange={(value) => setFilters((current) => ({ ...current, currency: value }))}
            options={currencyOptions}
            triggerClassName="h-11 rounded-2xl"
          />

          {isTenantAdmin ? (
            <SelectField
              value={filters.employee_id}
              onValueChange={(value) =>
                setFilters((current) => ({ ...current, employee_id: value }))
              }
              disabled={isLoadingFilters}
              options={employeeOptions}
              triggerClassName="h-11 rounded-2xl"
            />
          ) : null}

          {isTenantAdmin ? (
            <SelectField
              value={filters.service_id}
              onValueChange={(value) =>
                setFilters((current) => ({ ...current, service_id: value }))
              }
              disabled={isLoadingFilters}
              options={serviceOptions}
              triggerClassName="h-11 rounded-2xl"
            />
          ) : null}

          <button
            type="submit"
            className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-surface-soft"
          >
            Aplicar filtros
          </button>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-surface-soft"
            >
              Limpiar filtros
            </button>
          ) : null}
        </form>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      ) : null}

      {isLoading && !overview ? (
        <Card className="p-6">
          <p className="text-sm text-muted">Cargando reportes...</p>
        </Card>
      ) : null}

      {overview ? (
        <>
          <div data-tour="reports-summary" className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {summaryCards.map((card) => (
              <Card key={card.label} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                    {card.label}
                  </p>
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${card.iconToneClass}`.trim()}
                  >
                    <card.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-xl font-semibold text-fg-strong">{card.value}</p>
              </Card>
            ))}
          </div>

          <Card data-tour="reports-trend-chart" className="p-4">
            <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-fg-strong">
              <BarChart3 className="h-4 w-4 text-accent" />
              Tendencia
            </h3>
            <p className="text-sm text-muted">
              Serie temporal agrupada por {overview.filters.group_by}.
            </p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={overview.time_series}
                  margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="reportsRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-primary-soft)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--chart-primary-soft)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="period_label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'Ingresos') {
                        return [formatMoney(Number(value), activeCurrency), 'Ingresos'];
                      }
                      return [formatInteger(Number(value)), name];
                    }}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid var(--chart-tooltip-border)',
                      background: 'var(--chart-tooltip-bg)',
                    }}
                  />
                  <Area
                    yAxisId="right"
                    name="Ingresos"
                    type="monotone"
                    dataKey="revenue_total_usd"
                    stroke="var(--chart-primary)"
                    strokeWidth={2}
                    fill="url(#reportsRevenueGradient)"
                    dot={{ fill: 'var(--chart-primary)', r: 2.8 }}
                  />
                  <Line
                    yAxisId="left"
                    name="Citas"
                    type="monotone"
                    dataKey="bookings_total"
                    stroke="var(--chart-secondary)"
                    strokeWidth={1.75}
                    dot={{ fill: 'var(--chart-secondary)', r: 2.5 }}
                  />
                  <Line
                    yAxisId="left"
                    name="Canceladas"
                    type="monotone"
                    dataKey="cancelled_count"
                    stroke="var(--chart-tertiary)"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div data-tour="reports-rankings" className="grid gap-3 xl:grid-cols-2">
            <Card className="p-4">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-fg-strong">
                <Wrench className="h-4 w-4 text-accent" />
                Top servicios
              </h3>
              <div className="mt-3 space-y-2 md:hidden">
                {overview.top_services.map((row) => (
                  <article
                    key={row.service_id}
                    className="rounded-2xl border border-border-soft bg-surface-soft p-3"
                  >
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
                      <Wrench className="h-3.5 w-3.5 text-fg-soft" />
                      {row.service_name}
                    </p>
                    {showServiceTenantColumn ? (
                      <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted">
                        <Building2 className="h-3.5 w-3.5" />
                        {formatTenantLabel(row)}
                      </p>
                    ) : null}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <p className="text-muted">
                        Items:{' '}
                        <span className="font-medium text-fg">
                          {formatInteger(row.sold_items_count)}
                        </span>
                      </p>
                      <p className="text-muted">
                        Citas:{' '}
                        <span className="font-medium text-fg">
                          {formatInteger(row.bookings_count)}
                        </span>
                      </p>
                      <p className="text-muted">
                        Ingresos:{' '}
                        <span className="font-medium text-fg">
                          {formatMoney(row.revenue_total_usd, activeCurrency)}
                        </span>
                      </p>
                    </div>
                  </article>
                ))}
                {overview.top_services.length === 0 ? (
                  <p className="rounded-2xl border border-border-soft bg-surface-soft px-3 py-4 text-sm text-muted">
                    Sin datos para este filtro.
                  </p>
                ) : null}
              </div>

              <div className="mt-3 hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-soft text-xs uppercase tracking-[0.08em] text-muted">
                      <th className="px-2 py-2">Servicio</th>
                      {showServiceTenantColumn ? <th className="px-2 py-2">Negocio</th> : null}
                      <th className="px-2 py-2">Items</th>
                      <th className="px-2 py-2">Citas</th>
                      <th className="px-2 py-2">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.top_services.map((row) => (
                      <tr key={row.service_id} className="border-b border-border-soft">
                        <td className="px-2 py-2 text-fg">
                          <span className="inline-flex items-center gap-2">
                            <Wrench className="h-3.5 w-3.5 text-muted" />
                            {row.service_name}
                          </span>
                        </td>
                        {showServiceTenantColumn ? (
                          <td className="px-2 py-2 text-muted">
                            <span className="inline-flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5" />
                              {formatTenantLabel(row)}
                            </span>
                          </td>
                        ) : null}
                        <td className="px-2 py-2 text-muted">
                          {formatInteger(row.sold_items_count)}
                        </td>
                        <td className="px-2 py-2 text-muted">
                          {formatInteger(row.bookings_count)}
                        </td>
                        <td className="px-2 py-2 text-muted">
                          {formatMoney(row.revenue_total_usd, activeCurrency)}
                        </td>
                      </tr>
                    ))}
                    {overview.top_services.length === 0 ? (
                      <tr>
                        <td
                          className="px-2 py-4 text-muted"
                          colSpan={showServiceTenantColumn ? 5 : 4}
                        >
                          Sin datos para este filtro.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-fg-strong">
                <Users className="h-4 w-4 text-accent" />
                Top profesionales
              </h3>
              <div className="mt-3 space-y-2 md:hidden">
                {overview.top_employees.map((row) => (
                  <article
                    key={row.employee_id}
                    className="rounded-2xl border border-border-soft bg-surface-soft p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={row.employee_name}
                        imageUrl={row.avatar_url}
                        className="h-8 w-8 text-[10px]"
                      />
                      <p className="text-sm font-semibold text-fg">{row.employee_name}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <p className="text-muted">
                        Citas:{' '}
                        <span className="font-medium text-fg">
                          {formatInteger(row.bookings_count)}
                        </span>
                      </p>
                      <p className="text-muted">
                        Completados:{' '}
                        <span className="font-medium text-fg">
                          {formatInteger(row.completed_count)}
                        </span>
                      </p>
                      <p className="text-muted">
                        Ingresos:{' '}
                        <span className="font-medium text-fg">
                          {formatMoney(row.revenue_total_usd, activeCurrency)}
                        </span>
                      </p>
                    </div>
                  </article>
                ))}
                {overview.top_employees.length === 0 ? (
                  <p className="rounded-2xl border border-border-soft bg-surface-soft px-3 py-4 text-sm text-muted">
                    Sin datos para este filtro.
                  </p>
                ) : null}
              </div>

              <div className="mt-3 hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-soft text-xs uppercase tracking-[0.08em] text-muted">
                      <th className="px-2 py-2">Profesional</th>
                      <th className="px-2 py-2">Citas</th>
                      <th className="px-2 py-2">Completados</th>
                      <th className="px-2 py-2">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.top_employees.map((row) => (
                      <tr key={row.employee_id} className="border-b border-border-soft">
                        <td className="px-2 py-2 text-fg">
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={row.employee_name}
                              imageUrl={row.avatar_url}
                              className="h-7 w-7 text-[10px]"
                            />
                            <span>{row.employee_name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-muted">
                          {formatInteger(row.bookings_count)}
                        </td>
                        <td className="px-2 py-2 text-muted">
                          {formatInteger(row.completed_count)}
                        </td>
                        <td className="px-2 py-2 text-muted">
                          {formatMoney(row.revenue_total_usd, activeCurrency)}
                        </td>
                      </tr>
                    ))}
                    {overview.top_employees.length === 0 ? (
                      <tr>
                        <td className="px-2 py-4 text-muted" colSpan={4}>
                          Sin datos para este filtro.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div
            data-tour="reports-channels-reminders"
            className="grid gap-3 xl:grid-cols-[1.4fr_1fr]"
          >
            <Card className="p-4">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-fg-strong">
                <Radio className="h-4 w-4 text-accent" />
                Canales
              </h3>
              <div className="mt-3 space-y-2 md:hidden">
                {overview.source_breakdown.map((row) => (
                  <article
                    key={row.source}
                    className="rounded-2xl border border-border-soft bg-surface-soft p-3"
                  >
                    <p className="text-sm font-semibold text-fg">{formatSourceLabel(row.source)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <p className="text-muted">
                        Citas:{' '}
                        <span className="font-medium text-fg">
                          {formatInteger(row.bookings_count)}
                        </span>
                      </p>
                      <p className="text-muted">
                        Completados:{' '}
                        <span className="font-medium text-fg">
                          {formatInteger(row.completed_count)}
                        </span>
                      </p>
                      <p className="text-muted">
                        Canceladas:{' '}
                        <span className="font-medium text-fg">
                          {formatInteger(row.cancelled_count)}
                        </span>
                      </p>
                      <p className="text-muted">
                        Ingresos:{' '}
                        <span className="font-medium text-fg">
                          {formatMoney(row.revenue_total_usd, activeCurrency)}
                        </span>
                      </p>
                    </div>
                  </article>
                ))}
                {overview.source_breakdown.length === 0 ? (
                  <p className="rounded-2xl border border-border-soft bg-surface-soft px-3 py-4 text-sm text-muted">
                    Sin datos para este filtro.
                  </p>
                ) : null}
              </div>

              <div className="mt-3 hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-soft text-xs uppercase tracking-[0.08em] text-muted">
                      <th className="px-2 py-2">Canal</th>
                      <th className="px-2 py-2">Citas</th>
                      <th className="px-2 py-2">Completados</th>
                      <th className="px-2 py-2">Canceladas</th>
                      <th className="px-2 py-2">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.source_breakdown.map((row) => (
                      <tr key={row.source} className="border-b border-border-soft">
                        <td className="px-2 py-2 text-fg">{formatSourceLabel(row.source)}</td>
                        <td className="px-2 py-2 text-muted">
                          {formatInteger(row.bookings_count)}
                        </td>
                        <td className="px-2 py-2 text-muted">
                          {formatInteger(row.completed_count)}
                        </td>
                        <td className="px-2 py-2 text-muted">
                          {formatInteger(row.cancelled_count)}
                        </td>
                        <td className="px-2 py-2 text-muted">
                          {formatMoney(row.revenue_total_usd, activeCurrency)}
                        </td>
                      </tr>
                    ))}
                    {overview.source_breakdown.length === 0 ? (
                      <tr>
                        <td className="px-2 py-4 text-muted" colSpan={5}>
                          Sin datos para este filtro.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-fg-strong">
                <BellRing className="h-4 w-4 text-accent" />
                Recordatorios
              </h3>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-muted">
                  Programados:{' '}
                  <span className="font-medium text-fg">
                    {formatInteger(overview.reminders.scheduled_total)}
                  </span>
                </p>
                <p className="text-muted">
                  Enviados:{' '}
                  <span className="font-medium text-fg">
                    {formatInteger(overview.reminders.sent_count)}
                  </span>
                </p>
                <p className="text-muted">
                  Fallidos:{' '}
                  <span className="font-medium text-fg">
                    {formatInteger(overview.reminders.failed_count)}
                  </span>
                </p>
                <p className="text-muted">
                  Saltados:{' '}
                  <span className="font-medium text-fg">
                    {formatInteger(overview.reminders.skipped_count)}
                  </span>
                </p>
                <p className="text-muted">
                  Pendientes:{' '}
                  <span className="font-medium text-fg">
                    {formatInteger(overview.reminders.pending_count)}
                  </span>
                </p>
                <p className="text-muted">
                  Tasa de envío:{' '}
                  <span className="font-medium text-fg">
                    {formatRate(overview.reminders.sent_rate)}
                  </span>
                </p>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </section>
  );
}
