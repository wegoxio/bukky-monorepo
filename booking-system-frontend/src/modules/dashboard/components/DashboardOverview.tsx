'use client';

import { useAuth } from '@/context/AuthContext';
import SelectField, { type SelectOption } from '@/modules/ui/SelectField';
import { CircleHelp, Coins, DollarSign, Euro, LoaderCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { DashboardOverviewResponse } from '@/types/dashboard.types';
import DashboardStatsGrid from './DashboardStatsGrid';
import DashboardTenantsTableCard from './DashboardTenantsTableCard';
import RecentAuditLogsCard from './RecentAuditLogsCard';
import DashboardRevenueChartCard from './DashboardRevenueChartCard';
import { dashboardService } from '../services/dashboard.service';
import { normalizeString } from '@/utils/format';

const CURRENCY_OPTIONS: SelectOption[] = [
  {
    value: '',
    label: 'Divisa automática',
    description: 'Usa la moneda principal del panel',
    icon: Coins,
  },
  {
    value: 'USD',
    label: 'USD',
    description: 'Dólar estadounidense',
    icon: DollarSign,
  },
  {
    value: 'EUR',
    label: 'EUR',
    description: 'Euro',
    icon: Euro,
  },
  {
    value: 'DOP',
    label: 'DOP',
    description: 'Peso dominicano',
    initials: 'RD$',
  },
  {
    value: 'MXN',
    label: 'MXN',
    description: 'Peso mexicano',
    initials: 'MX$',
  },
  {
    value: 'COP',
    label: 'COP',
    description: 'Peso colombiano',
    initials: 'CO$',
  },
];

export default function DashboardOverview() {
  const { user, token } = useAuth();
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currency, setCurrency] = useState('');
  const userRole = user?.role;

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await dashboardService.getOverview(token, {
        currency: currency || (userRole === 'SUPER_ADMIN' ? 'USD' : undefined),
      });
      setOverview(data);
      if (!currency) setCurrency(data.currency);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el panel.');
    } finally {
      setIsLoading(false);
    }
  }, [currency, token, userRole]);

  useEffect(() => {
    if (!token) return;
    void loadOverview();
  }, [token, loadOverview]);

  const normalizedUserName = normalizeString(user?.name ?? '');
  const normalizedTenantName = normalizeString(user?.tenant?.name ?? '');
  const welcomeTarget = normalizedUserName || normalizedTenantName;
  const dashboardTitle = welcomeTarget ? `Bienvenido, ${welcomeTarget}` : 'Bienvenido';
  const dashboardSubtitle =
    user?.role === 'TENANT_ADMIN'
      ? normalizedTenantName
        ? `Resumen operativo de ${normalizedTenantName}.`
        : 'Resumen operativo de tu negocio.'
      : 'Resumen general de la plataforma.';
  const isSuperAdmin = overview?.role === 'SUPER_ADMIN' || user?.role === 'SUPER_ADMIN';
  const canRunTour = user?.role === 'TENANT_ADMIN';

  const handleStartTour = () => {
    if (!canRunTour) return;
    window.dispatchEvent(new CustomEvent('bukky-onboarding:open'));
  };

  return (
    <section data-tour="dashboard-overview" className="space-y-3">
      <div data-tour="dashboard-header" className="flex items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-[42px] font-semibold leading-none text-fg-strong">
            {dashboardTitle}
          </h2>
          <p className="mt-2 text-sm text-muted">{dashboardSubtitle}</p>
        </div>

        <div className="inline-flex items-center gap-2">
          <div data-tour="dashboard-currency">
            <SelectField
              value={currency}
              onValueChange={setCurrency}
              options={CURRENCY_OPTIONS}
              triggerClassName="w-44 rounded-lg bg-surface-soft text-xs"
              contentClassName="z-[80]"
            />
          </div>
          <button
            type="button"
            onClick={handleStartTour}
            disabled={!canRunTour}
            data-tour={canRunTour ? 'dashboard-tour-trigger' : undefined}
            className={`grid h-8 w-20 place-items-center rounded-lg border border-border bg-surface-soft text-muted ${
              canRunTour ? 'hover:bg-surface' : 'cursor-not-allowed opacity-50'
            }`}
            aria-label={canRunTour ? 'Iniciar tour guiado' : 'Tour no disponible para este perfil'}
            title={
              canRunTour ? 'Iniciar tour guiado' : 'Tour disponible solo para admin de negocio'
            }
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={isLoading || !token}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-soft px-3 py-2 text-xs text-muted disabled:opacity-60"
          >
            {isLoading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Actualizar
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      ) : null}

      {overview ? (
        <>
          <div data-tour="dashboard-kpis">
            <DashboardStatsGrid metrics={overview.metrics} />
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.6fr_0.85fr]">
            <div data-tour="dashboard-chart">
              <DashboardRevenueChartCard
                title={
                  isSuperAdmin ? 'Ingresos y citas por mes' : 'Rendimiento mensual del negocio'
                }
                data={overview.chart}
                currency={overview.currency}
              />
            </div>
            <div data-tour="dashboard-recent-logs">
              <RecentAuditLogsCard
                title="Bitácora reciente"
                logs={overview.recent_logs}
                withRanges={false}
              />
            </div>
          </div>

          <div data-tour="dashboard-main-table">
            <DashboardTenantsTableCard
              role={overview.role}
              currency={overview.currency}
              tenants={overview.super_admin?.tenants}
              employees={overview.tenant_admin?.employees}
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border-soft bg-surface p-6 text-sm text-muted">
          {isLoading ? 'Cargando datos del panel...' : 'No hay datos para mostrar.'}
        </div>
      )}
    </section>
  );
}
