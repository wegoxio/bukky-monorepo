'use client';

import { useTenantSettings } from '@/context/TenantSettingsContext';
import Image from 'next/image';
import { defaultTenantSettings } from '@/modules/settings/config/default-tenant-settings';
import {
  getTenantAssetMaxSizeLabel,
  TENANT_SETTINGS_IMAGE_ACCEPT,
  validateTenantSettingsAssetFile,
} from '@/modules/settings/services/tenant-settings.service';
import {
  createThemeVariables,
  normalizeThemeSettings,
} from '@/modules/settings/utils/theme-colors';
import ColorPickerField from '@/modules/ui/ColorPickerField';
import ConfirmActionModal from '@/modules/ui/ConfirmActionModal';
import type {
  TenantThemeSettings,
  UpdateTenantSettingsPayload,
} from '@/types/tenant-settings.types';
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ImageIcon,
  LoaderCircle,
  Monitor,
  Palette,
  RotateCcw,
  Smartphone,
  Sparkles,
  Type,
  Upload,
} from 'lucide-react';
import {
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

type EditableThemeKey = 'primary' | 'secondary' | 'tertiary' | 'textPrimary' | 'textSecondary';

type PanelSectionKey = 'palette' | 'branding' | 'assets';

const editableThemeFields: Array<{
  key: EditableThemeKey;
  label: string;
  description: string;
}> = [
  {
    key: 'primary',
    label: 'Accent principal',
    description: 'Botones, llamados a la acción y acciones importantes.',
  },
  {
    key: 'secondary',
    label: 'Canvas del panel',
    description: 'Base del panel, tarjetas y fondos suaves.',
  },
  {
    key: 'tertiary',
    label: 'Barra lateral / marco',
    description: 'Estructura visual y contraste oscuro.',
  },
  {
    key: 'textPrimary',
    label: 'Texto principal',
    description: 'Títulos y lectura principal.',
  },
  {
    key: 'textSecondary',
    label: 'Texto de soporte',
    description: 'Labels, metadata y contexto.',
  },
];

const settingsDemoChartData = [
  { label: 'Ene', revenue: 540, bookings: 430, cancelled: 120 },
  { label: 'Feb', revenue: 690, bookings: 510, cancelled: 140 },
  { label: 'Mar', revenue: 620, bookings: 570, cancelled: 110 },
  { label: 'Abr', revenue: 780, bookings: 630, cancelled: 150 },
  { label: 'May', revenue: 710, bookings: 590, cancelled: 130 },
  { label: 'Jun', revenue: 860, bookings: 660, cancelled: 170 },
];

const settingsPreviewSidebarItems = ['Panel', 'Citas', 'Empleados', 'Configuración'];

const settingsPreviewAppointments = [
  { customer: 'Carlos Ruiz', service: 'Fade + barba', time: '10:30' },
  { customer: 'Ana Pérez', service: 'Color + secado', time: '11:15' },
  { customer: 'Mateo Gil', service: 'Corte premium', time: '12:00' },
];

const settingsPreviewMetrics = [
  { label: 'Citas hoy', value: '18', detail: 'agenda activa' },
  { label: 'Ingresos', value: '$4,820', detail: 'semana actual' },
  { label: 'Inasistencias', value: '7', detail: 'seguimiento operativo' },
];

const settingsPreviewSignals = [
  { label: 'Confirmadas', value: '82%', progress: 82, color: 'var(--success)' },
  { label: 'Reagendadas', value: '11%', progress: 42, color: 'var(--chart-secondary)' },
  { label: 'Riesgo de inasistencia', value: '7%', progress: 24, color: 'var(--danger)' },
];

const settingsPreviewPublicServices = ['Fade premium', 'Color express', 'Corte + barba'];
const LOGO_MAX_SIZE_LABEL = getTenantAssetMaxSizeLabel('logo');
const FAVICON_MAX_SIZE_LABEL = getTenantAssetMaxSizeLabel('favicon');

function equalEditableTheme(a: TenantThemeSettings, b: TenantThemeSettings) {
  return editableThemeFields.every(({ key }) => a[key] === b[key]);
}

function SectionCard({
  title,
  description,
  icon,
  children,
  isOpen,
  onToggle,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-[24px] border border-card-border bg-card p-5 shadow-theme-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 text-left"
      >
        <div className="mt-0.5 rounded-2xl border border-card-border bg-surface p-2 text-fg-secondary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-fg-strong">{title}</h3>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out ${
          isOpen ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </article>
  );
}

export default function TenantSettingsPanel() {
  const {
    settings,
    canEditTenantSettings,
    isLoadingSettings,
    isSavingSettings,
    errorMessage,
    saveSettings,
    uploadBrandingAsset,
  } = useTenantSettings();

  const [themeDraft, setThemeDraft] = useState<TenantThemeSettings>(() =>
    normalizeThemeSettings(settings.theme),
  );
  const [brandingDraft, setBrandingDraft] = useState({
    appName: settings.branding.appName,
    windowTitle: settings.branding.windowTitle,
  });
  const [logoPreview, setLogoPreview] = useState(settings.branding.logoUrl);
  const [faviconPreview, setFaviconPreview] = useState(settings.branding.faviconUrl);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingFaviconFile, setPendingFaviconFile] = useState<File | null>(null);
  const [useDefaultLogo, setUseDefaultLogo] = useState(false);
  const [useDefaultFavicon, setUseDefaultFavicon] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<PanelSectionKey, boolean>>({
    palette: true,
    branding: false,
    assets: false,
  });

  const tempLogoUrlRef = useRef<string | null>(null);
  const tempFaviconUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setThemeDraft(normalizeThemeSettings(settings.theme));
    setBrandingDraft({
      appName: settings.branding.appName,
      windowTitle: settings.branding.windowTitle,
    });

    if (tempLogoUrlRef.current) {
      URL.revokeObjectURL(tempLogoUrlRef.current);
      tempLogoUrlRef.current = null;
    }
    if (tempFaviconUrlRef.current) {
      URL.revokeObjectURL(tempFaviconUrlRef.current);
      tempFaviconUrlRef.current = null;
    }

    setLogoPreview(settings.branding.logoUrl);
    setFaviconPreview(settings.branding.faviconUrl);
    setPendingLogoFile(null);
    setPendingFaviconFile(null);
    setUseDefaultLogo(false);
    setUseDefaultFavicon(false);
  }, [settings]);

  useEffect(() => {
    return () => {
      if (tempLogoUrlRef.current) URL.revokeObjectURL(tempLogoUrlRef.current);
      if (tempFaviconUrlRef.current) URL.revokeObjectURL(tempFaviconUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!errorMessage) return;
    toast.error(errorMessage, { id: 'tenant-settings-error' });
  }, [errorMessage]);

  const previewTheme = useMemo(() => createThemeVariables(themeDraft, 'AUTO', {}), [themeDraft]);
  const previewStyle = useMemo(() => previewTheme as CSSProperties, [previewTheme]);
  const previewSidebarStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(180deg, ${previewTheme['--sidebar-bg-start']}, ${previewTheme['--sidebar-bg-end']})`,
      color: previewTheme['--sidebar-text'],
    }),
    [previewTheme],
  );
  const previewSidebarItemStyle = useMemo(
    () => ({
      backgroundColor: 'transparent',
      color: previewTheme['--inverse-80'],
    }),
    [previewTheme],
  );
  const previewSidebarHoverStyle = useMemo(
    () => ({
      backgroundColor: previewTheme['--sidebar-hover-bg'],
      color: previewTheme['--sidebar-text'],
    }),
    [previewTheme],
  );
  const previewSidebarActiveStyle = useMemo(
    () => ({
      backgroundColor: previewTheme['--primary-accent'],
      color: previewTheme['--primary-accent-text'],
      boxShadow: previewTheme['--shadow-accent-sm'],
    }),
    [previewTheme],
  );

  const brandingPreviewName =
    brandingDraft.appName.trim() || defaultTenantSettings.branding.appName;
  const brandingPreviewTitle =
    brandingDraft.windowTitle.trim() || defaultTenantSettings.branding.windowTitle;
  const hasThemeChanges = !equalEditableTheme(themeDraft, settings.theme);
  const hasBrandingChanges =
    brandingPreviewName !== settings.branding.appName ||
    brandingPreviewTitle !== settings.branding.windowTitle;
  const hasDefaultAssetChanges =
    (useDefaultLogo && settings.branding.logoUrl !== defaultTenantSettings.branding.logoUrl) ||
    (useDefaultFavicon &&
      settings.branding.faviconUrl !== defaultTenantSettings.branding.faviconUrl);
  const hasAssetUploads = !!pendingLogoFile || !!pendingFaviconFile;
  const hasChanges =
    hasThemeChanges || hasBrandingChanges || hasDefaultAssetChanges || hasAssetUploads;
  const willReturnToSimplifiedMode = hasThemeChanges && settings.themeMode !== 'AUTO';
  const hasAdvancedThemeActive =
    settings.themeMode === 'ADVANCED' && Object.keys(settings.themeOverrides).length > 0;
  const isBusy = isLoadingSettings || isSavingSettings || isApplying;

  const pendingItems = [
    hasThemeChanges && 'paleta',
    hasBrandingChanges && 'marca',
    hasDefaultAssetChanges && 'restauración de recursos',
    hasAssetUploads && 'nuevas imágenes',
    willReturnToSimplifiedMode && 'modo simplificado',
  ]
    .filter(Boolean)
    .join(', ');

  const applyEditableThemeField = (key: EditableThemeKey, value: string) => {
    setThemeDraft((current) =>
      normalizeThemeSettings({
        ...current,
        [key]: value,
      }),
    );
  };

  const toggleSection = (section: PanelSectionKey) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const syncFromSettings = () => {
    setThemeDraft(normalizeThemeSettings(settings.theme));
    setBrandingDraft({
      appName: settings.branding.appName,
      windowTitle: settings.branding.windowTitle,
    });
    setLogoPreview(settings.branding.logoUrl);
    setFaviconPreview(settings.branding.faviconUrl);
    setPendingLogoFile(null);
    setPendingFaviconFile(null);
    setUseDefaultLogo(false);
    setUseDefaultFavicon(false);
    toast.success('Cambios descartados.');
  };

  const loadPredeterminados = () => {
    setThemeDraft(normalizeThemeSettings(defaultTenantSettings.theme));
    setBrandingDraft({
      appName: defaultTenantSettings.branding.appName,
      windowTitle: defaultTenantSettings.branding.windowTitle,
    });
    setUseDefaultLogo(true);
    setUseDefaultFavicon(true);
    setLogoPreview(defaultTenantSettings.branding.logoUrl);
    setFaviconPreview(defaultTenantSettings.branding.faviconUrl);
    setPendingLogoFile(null);
    setPendingFaviconFile(null);
    toast('Predeterminados cargados. Revisa la vista previa y confirma si te gusta.');
  };

  const onAssetUpload = async (
    assetType: 'logo' | 'favicon',
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      await validateTenantSettingsAssetFile(assetType, file);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Archivo inválido. Usa PNG, JPG, WEBP o ICO.';
      toast.error(message);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (assetType === 'logo') {
      if (tempLogoUrlRef.current) URL.revokeObjectURL(tempLogoUrlRef.current);
      tempLogoUrlRef.current = objectUrl;
      setLogoPreview(objectUrl);
      setPendingLogoFile(file);
      setUseDefaultLogo(false);
      toast.success('Logo listo para guardar.');
      return;
    }

    if (tempFaviconUrlRef.current) URL.revokeObjectURL(tempFaviconUrlRef.current);
    tempFaviconUrlRef.current = objectUrl;
    setFaviconPreview(objectUrl);
    setPendingFaviconFile(file);
    setUseDefaultFavicon(false);
    toast.success('Favicon listo para guardar.');
  };

  const applyChanges = async () => {
    if (!hasChanges) return;

    setIsApplying(true);
    try {
      const payload: UpdateTenantSettingsPayload = {};

      if (hasThemeChanges) payload.theme = { ...themeDraft };
      if (hasThemeChanges && settings.themeMode !== 'AUTO') payload.themeMode = 'AUTO';
      if (hasBrandingChanges) {
        payload.branding = {
          appName: brandingPreviewName,
          windowTitle: brandingPreviewTitle,
        };
      }
      if (useDefaultLogo && settings.branding.logoUrl !== defaultTenantSettings.branding.logoUrl) {
        payload.branding = {
          ...(payload.branding ?? {}),
          logoUrl: defaultTenantSettings.branding.logoUrl,
        };
      }
      if (
        useDefaultFavicon &&
        settings.branding.faviconUrl !== defaultTenantSettings.branding.faviconUrl
      ) {
        payload.branding = {
          ...(payload.branding ?? {}),
          faviconUrl: defaultTenantSettings.branding.faviconUrl,
        };
      }

      if (payload.theme || payload.branding || payload.themeMode) {
        await saveSettings(payload);
      }
      if (pendingLogoFile) await uploadBrandingAsset('logo', pendingLogoFile);
      if (pendingFaviconFile) await uploadBrandingAsset('favicon', pendingFaviconFile);

      setConfirmOpen(false);
      toast.success('Identidad visual actualizada correctamente.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron aplicar los cambios.';
      toast.error(message);
    } finally {
      setIsApplying(false);
    }
  };

  if (!canEditTenantSettings) {
    return <p className="text-sm text-muted">No tienes permisos para editar configuración.</p>;
  }

  return (
    <section data-tour="theme-builder-section" className="space-y-5">
      <div
        data-tour="theme-builder-header"
        className="rounded-[28px] border border-card-border bg-gradient-to-br from-surface-warm via-surface to-surface-soft p-6 shadow-theme-soft"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-warning bg-surface-warning px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-warning">
              <Sparkles className="h-3.5 w-3.5" />
              Sistema visual
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-fg-strong">
              Paleta simplificada
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              El panel ahora se controla con 5 colores editables. Hover, superficies, contrastes y
              estados se derivan automáticamente para que la personalización sea más simple y tenga
              impacto real.
            </p>
            <p className="mt-2 text-xs text-muted">
              {pendingItems
                ? `Pendiente: ${pendingItems}.`
                : 'No hay cambios pendientes en la identidad visual.'}
            </p>
          </div>

          <div data-tour="theme-builder-actions" className="flex flex-wrap items-center gap-2">
            {isBusy ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs text-neutral">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                {isLoadingSettings ? 'Cargando...' : 'Guardando...'}
              </span>
            ) : null}
            <button
              type="button"
              onClick={loadPredeterminados}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium text-neutral transition-colors hover:bg-secondary-hover"
            >
              <RotateCcw className="h-4 w-4" />
              Predeterminados
            </button>
            <button
              type="button"
              onClick={syncFromSettings}
              disabled={!hasChanges || isBusy}
              className="rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium text-neutral transition-colors hover:bg-secondary-hover"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!hasChanges || isBusy}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text shadow-theme-accent transition-colors hover:bg-accent-hover"
            >
              Aplicar cambios
            </button>
          </div>
        </div>
      </div>

      {hasAdvancedThemeActive ? (
        <div className="rounded-2xl border border-border-warning bg-surface-warning-soft px-4 py-3 text-sm text-warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Este negocio tiene ajustes avanzados activos. Cuando guardes una nueva paleta, el tema
              volverá a modo simplificado para que la marca quede consistente en todo el panel.
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-border-danger bg-surface-danger-soft px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside
          data-tour="theme-builder-controls"
          className="space-y-5 xl:sticky xl:top-4 xl:self-start"
        >
          <div data-tour="theme-builder-palette">
            <SectionCard
              title="Colores editables"
              description="Solo editas la base y textos. El sistema deriva hover, superficies y estados automáticamente."
              icon={<Palette className="h-4 w-4" />}
              isOpen={expandedSections.palette}
              onToggle={() => toggleSection('palette')}
            >
              <div className="space-y-3">
                {editableThemeFields.map((field) => (
                  <label
                    key={field.key}
                    className="block rounded-2xl border border-card-border bg-surface p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="block text-sm font-semibold text-fg-strong">
                          {field.label}
                        </span>
                        <span className="mt-1 block text-xs text-muted">{field.description}</span>
                      </div>
                      <span
                        className="mt-0.5 h-4 w-4 rounded-full border border-border-soft"
                        style={{ backgroundColor: themeDraft[field.key] }}
                      />
                    </div>
                    <div className="mt-3">
                      <ColorPickerField
                        value={themeDraft[field.key]}
                        onChange={(value) => applyEditableThemeField(field.key, value)}
                        ariaLabel={`Editar ${field.label}`}
                      />
                    </div>
                  </label>
                ))}
              </div>
            </SectionCard>
          </div>

          <div data-tour="theme-builder-branding">
            <SectionCard
              title="Marca"
              description="Nombre del negocio y título de la ventana."
              icon={<Type className="h-4 w-4" />}
              isOpen={expandedSections.branding}
              onToggle={() => toggleSection('branding')}
            >
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Nombre del panel
                  </span>
                  <input
                    value={brandingDraft.appName}
                    onChange={(event) =>
                      setBrandingDraft((prev) => ({ ...prev, appName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-card-border bg-surface px-3 py-2 text-sm text-fg"
                    placeholder="Nombre del negocio"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Título de ventana
                  </span>
                  <input
                    value={brandingDraft.windowTitle}
                    onChange={(event) =>
                      setBrandingDraft((prev) => ({ ...prev, windowTitle: event.target.value }))
                    }
                    className="w-full rounded-xl border border-card-border bg-surface px-3 py-2 text-sm text-fg"
                    placeholder="Mi negocio | Panel"
                  />
                </label>
              </div>
            </SectionCard>
          </div>

          <div data-tour="theme-builder-assets">
            <SectionCard
              title="Recursos"
              description="Logo y favicon con previsualización antes de guardar."
              icon={<ImageIcon className="h-4 w-4" />}
              isOpen={expandedSections.assets}
              onToggle={() => toggleSection('assets')}
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-card-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-fg-strong">Logo</p>
                      <p className="mt-1 text-xs text-muted">
                        PNG, JPG o WEBP. Máximo {LOGO_MAX_SIZE_LABEL}.
                      </p>
                    </div>
                    <Image
                      src={logoPreview || defaultTenantSettings.branding.logoUrl}
                      alt="Vista previa del logo"
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-xl border border-border-soft bg-surface object-contain p-2"
                      onError={(event) => {
                        event.currentTarget.src = defaultTenantSettings.branding.logoUrl;
                      }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover">
                      <Upload className="h-3.5 w-3.5" />
                      Subir logo
                      <input
                        type="file"
                        accept={TENANT_SETTINGS_IMAGE_ACCEPT}
                        className="hidden"
                        onChange={(event) => {
                          void onAssetUpload('logo', event);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setUseDefaultLogo(true);
                        setPendingLogoFile(null);
                        setLogoPreview(defaultTenantSettings.branding.logoUrl);
                      }}
                      className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover"
                    >
                      Predeterminado
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-card-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-fg-strong">Favicon</p>
                      <p className="mt-1 text-xs text-muted">
                        PNG, ICO o WEBP. Máximo {FAVICON_MAX_SIZE_LABEL}.
                      </p>
                    </div>
                    <Image
                      src={faviconPreview || defaultTenantSettings.branding.faviconUrl}
                      alt="Vista previa del favicon"
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-xl border border-border-soft bg-surface object-contain p-2"
                      onError={(event) => {
                        event.currentTarget.src = defaultTenantSettings.branding.faviconUrl;
                      }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover">
                      <Upload className="h-3.5 w-3.5" />
                      Subir favicon
                      <input
                        type="file"
                        accept={TENANT_SETTINGS_IMAGE_ACCEPT}
                        className="hidden"
                        onChange={(event) => {
                          void onAssetUpload('favicon', event);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setUseDefaultFavicon(true);
                        setPendingFaviconFile(null);
                        setFaviconPreview(defaultTenantSettings.branding.faviconUrl);
                      }}
                      className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-neutral transition-colors hover:bg-secondary-hover"
                    >
                      Predeterminado
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </aside>

        <div data-tour="theme-builder-preview" style={previewStyle} className="space-y-5">
          <article className="rounded-[24px] border border-card-border bg-card p-5 shadow-theme-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-fg-strong">Vista previa modular</h3>
                <p className="mt-1 text-sm text-muted">
                  Barra lateral a la izquierda y componentes sueltos a la derecha para leer mejor la
                  identidad visual.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-card-border bg-surface px-3 py-1 text-xs font-medium text-muted">
                <Palette className="h-3.5 w-3.5 text-fg-secondary" />5 colores editables
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-12">
              <div
                className="relative overflow-hidden rounded-3xl border border-card-border p-4 shadow-theme-card xl:col-span-12"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at top left, var(--surface-warm), transparent 36%), radial-gradient(circle at right center, var(--surface-muted), transparent 30%), linear-gradient(180deg, var(--surface), var(--surface-panel))',
                }}
              >
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-secondary">
                      <Monitor className="h-3.5 w-3.5" />
                      Panel
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-secondary">
                      <Smartphone className="h-3.5 w-3.5" />
                      Reserva pública
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Barra lateral definida y componentes sueltos para que la paleta respire mejor.
                  </p>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[248px_minmax(0,1fr)]">
                  <aside
                    className="flex min-h-[590px] flex-col justify-between rounded-[30px] border border-inverse-15 p-5 shadow-theme-shell"
                    style={previewSidebarStyle}
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <div
                          className="grid h-14 w-14 place-items-center rounded-[22px]"
                          style={previewSidebarItemStyle}
                        >
                          <Image
                            src={logoPreview || defaultTenantSettings.branding.logoUrl}
                            alt="Logo de marca"
                            width={36}
                            height={36}
                            unoptimized
                            className="h-9 w-9 object-contain"
                            onError={(event) => {
                              event.currentTarget.src = defaultTenantSettings.branding.logoUrl;
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-sidebar-text">
                            {brandingPreviewName}
                          </p>
                          <p className="truncate text-xs text-inverse-70">Panel operativo</p>
                        </div>
                      </div>

                      <div className="mt-8 space-y-2.5">
                        {settingsPreviewSidebarItems.map((item) => (
                          <div
                            key={item}
                            className="rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
                            style={
                              item === 'Configuración'
                                ? previewSidebarActiveStyle
                                : item === 'Citas'
                                  ? previewSidebarHoverStyle
                                  : previewSidebarItemStyle
                            }
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>

                  <div className="grid auto-rows-min gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
                    <section className="rounded-[28px] border border-card-border bg-surface p-4 shadow-theme-card lg:col-span-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                            Vista del negocio
                          </p>
                          <p className="mt-1 text-lg font-semibold text-fg-strong">
                            {brandingPreviewTitle}
                          </p>
                          <p className="mt-2 max-w-2xl text-sm text-fg-secondary">
                            La identidad se siente en tarjetas, estados y CTAs sin cortar la
                            composición del panel.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-xl border border-border-strong bg-surface-soft px-3 py-2 text-xs font-semibold text-neutral transition-colors hover:bg-secondary-hover">
                            Ver analítica
                          </button>
                          <button className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-text shadow-theme-accent">
                            Nueva reserva
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {settingsPreviewMetrics.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-[22px] border border-card-border bg-surface-soft px-4 py-3"
                          >
                            <p className="text-xs uppercase tracking-[0.12em] text-muted">
                              {item.label}
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-fg-strong">
                              {item.value}
                            </p>
                            <p className="mt-1 text-xs text-fg-secondary">{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-card-border bg-surface p-4 shadow-theme-card">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted">
                            Próximas citas
                          </p>
                          <p className="mt-1 text-base font-semibold text-fg-strong">
                            Agenda operativa
                          </p>
                        </div>
                        <span className="rounded-full bg-surface-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning">
                          Live
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {settingsPreviewAppointments.map((item) => (
                          <div
                            key={`${item.customer}-${item.time}`}
                            className="flex items-center justify-between rounded-2xl border border-border-soft bg-surface-soft px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-fg-strong">
                                {item.customer}
                              </p>
                              <p className="truncate text-xs text-fg-secondary">{item.service}</p>
                            </div>
                            <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-neutral">
                              {item.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-card-border bg-gradient-to-b from-surface-warm via-surface to-surface-soft p-4 shadow-theme-card">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                            Reserva pública
                          </p>
                          <p className="mt-1 text-base font-semibold text-fg-strong">
                            {brandingPreviewName}
                          </p>
                        </div>
                        <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-card-border bg-surface">
                          <Image
                            src={logoPreview || defaultTenantSettings.branding.logoUrl}
                            alt="Vista previa de marca"
                            width={28}
                            height={28}
                            unoptimized
                            className="h-7 w-7 object-contain"
                            onError={(event) => {
                              event.currentTarget.src = defaultTenantSettings.branding.logoUrl;
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 rounded-[22px] border border-card-border bg-surface p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted">
                          Servicio destacado
                        </p>
                        <p className="mt-1 text-lg font-semibold text-fg-strong">
                          Reserva clara y más premium
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {settingsPreviewPublicServices.map((item, index) => (
                            <span
                              key={item}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                index === 0
                                  ? 'bg-accent text-accent-text shadow-theme-accent-sm'
                                  : 'border border-card-border bg-surface-soft text-fg-secondary'
                              }`}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-card-border bg-surface p-4 shadow-theme-card">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted">
                            Señales de interfaz
                          </p>
                          <p className="mt-1 text-base font-semibold text-fg-strong">
                            Estados y ritmo visual
                          </p>
                        </div>
                        <span className="rounded-full border border-card-border bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-fg-secondary">
                          auto
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {settingsPreviewSignals.map((item) => (
                          <div key={item.label}>
                            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                              <span className="font-medium text-fg-secondary">{item.label}</span>
                              <span className="font-semibold text-fg-strong">{item.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-surface-soft">
                              <div
                                className="h-2 rounded-full"
                                style={{ width: `${item.progress}%`, backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid sm:grid-cols-1 grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-border-soft bg-surface-soft px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                            Contraste
                          </p>
                          <p className="mt-1 text-sm font-semibold text-fg-strong">
                            claro y legible
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border-soft bg-surface-soft px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                            Superficies
                          </p>
                          <p className="mt-1 text-sm font-semibold text-fg-strong">
                            suaves y ordenadas
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-card-border bg-surface p-4 shadow-theme-card">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted">Slots</p>
                          <p className="mt-1 text-base font-semibold text-fg-strong">
                            Horarios disponibles
                          </p>
                        </div>
                        <span className="rounded-full bg-surface-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning">
                          hoy
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {settingsPreviewAppointments.map((item, index) => (
                          <span
                            key={`${item.time}-slot`}
                            className={`rounded-xl border px-2 py-2 text-center text-[11px] font-semibold ${
                              index === 1
                                ? 'border-border-warning bg-surface-warning-soft text-warning'
                                : 'border-card-border bg-surface-soft text-fg-secondary'
                            }`}
                          >
                            {item.time}
                          </span>
                        ))}
                      </div>

                      <button className="mt-4 w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-accent-text shadow-theme-accent">
                        Confirmar cita
                      </button>
                      <p className="mt-2 text-center text-xs text-muted">
                        El cliente final percibe la marca en un bloque propio, sin recortes raros.
                      </p>
                    </section>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-card-border bg-surface p-4 xl:col-span-6">
                <h4 className="text-sm font-semibold text-fg-strong">Jerarquia tipografica</h4>
                <div className="mt-3 space-y-2 rounded-2xl border border-border-soft bg-surface-soft p-4">
                  <p className="text-base font-semibold text-fg-strong">
                    Heading fuerte para elementos clave
                  </p>
                  <p className="text-sm text-fg">
                    Texto principal para lectura normal y contenido productivo.
                  </p>
                  <p className="text-sm text-fg-secondary">
                    Texto de soporte para metadata y contexto.
                  </p>
                  <p className="text-sm text-muted">
                    Texto muted para notas o estados menos importantes.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-card-border bg-surface-soft p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">
                    Vista previa de marca
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-card-border bg-surface">
                      <Image
                        src={logoPreview || defaultTenantSettings.branding.logoUrl}
                        alt="Vista previa de marca"
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 object-contain"
                        onError={(event) => {
                          event.currentTarget.src = defaultTenantSettings.branding.logoUrl;
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-fg-strong">{brandingPreviewName}</p>
                      <p className="text-sm text-fg-secondary">{brandingPreviewTitle}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-border-soft bg-surface px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Logo</p>
                      <p className="mt-1 text-sm font-semibold text-fg-strong">presencia clara</p>
                    </div>
                    <div className="rounded-2xl border border-border-soft bg-surface px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Tono</p>
                      <p className="mt-1 text-sm font-semibold text-fg-strong">marca cohesionada</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-card-border bg-surface p-4 xl:col-span-6">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-fg-strong">Pulso de datos</h4>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-surface-soft px-2.5 py-1 text-[11px] font-medium text-fg-secondary">
                    <BarChart3 className="h-3.5 w-3.5" />
                    ritmo en vivo
                  </span>
                </div>
                <div className="mt-3 rounded-2xl border border-border-soft bg-surface-soft p-3">
                  <div className="mb-2 flex items-center gap-3 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-accent" />
                      Ingresos
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-chart-secondary" />
                      Citas
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-chart-tertiary" />
                      Canceladas
                    </span>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={settingsDemoChartData}
                        margin={{ top: 6, right: 8, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="settingsPreviewRevenueGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--chart-primary-soft)"
                              stopOpacity={0.32}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--chart-primary-soft)"
                              stopOpacity={0.04}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="var(--chart-grid)"
                          strokeDasharray="4 4"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                        />
                        <Tooltip
                          cursor={{ stroke: 'var(--chart-cursor)', strokeWidth: 1 }}
                          contentStyle={{
                            borderRadius: 10,
                            border: '1px solid var(--chart-tooltip-border)',
                            background: 'var(--chart-tooltip-bg)',
                            boxShadow: 'var(--shadow-row)',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="var(--chart-primary)"
                          strokeWidth={2}
                          fill="url(#settingsPreviewRevenueGradient)"
                          dot={{ fill: 'var(--chart-primary)', r: 2.5 }}
                          activeDot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="bookings"
                          stroke="var(--chart-secondary)"
                          strokeWidth={1.7}
                          dot={{ fill: 'var(--chart-secondary)', r: 2 }}
                          activeDot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="cancelled"
                          stroke="var(--chart-tertiary)"
                          strokeWidth={1.4}
                          strokeDasharray="3 3"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={confirmOpen}
        title="Aplicar nueva identidad visual"
        description={
          pendingItems
            ? `Se aplicarán cambios en: ${pendingItems}. Esta actualización impactará el panel y la experiencia pública del negocio.`
            : 'No hay cambios pendientes.'
        }
        checkboxLabel="Confirmo que deseo actualizar la identidad visual del negocio."
        confirmText="Aplicar cambios"
        isConfirming={isApplying || isSavingSettings}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          void applyChanges();
        }}
      />
    </section>
  );
}
