import type {
  TenantThemeMode,
  TenantThemeOverrides,
  TenantThemeSettings,
} from '@/types/tenant-settings.types';

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type ThemeVariableMap = Record<string, string>;

const THEME_OVERRIDE_CSS_VARS: Record<string, string> = {
  appBg: '--app-bg',
  shellBg: '--shell-bg',
  navbarBg: '--navbar-bg',
  sidebarBgStart: '--sidebar-bg-start',
  sidebarBgEnd: '--sidebar-bg-end',
  sidebarHoverBg: '--sidebar-hover-bg',
  sidebarActiveBg: '--sidebar-active-bg',
  sidebarActiveText: '--sidebar-active-text',
  cardBg: '--card-bg',
  surface: '--surface',
  surfaceSoft: '--surface-soft',
  surfaceMuted: '--surface-muted',
  surfaceSubtle: '--surface-subtle',
  surfacePanel: '--surface-panel',
  surfacePanelStrong: '--surface-panel-strong',
  surfaceWarm: '--surface-warm',
  accent: '--primary-accent',
  accentHover: '--primary-hover',
  accentText: '--primary-accent-text',
  textPrimary: '--text-primary',
  textBody: '--text-body',
  textStrong: '--text-strong',
  textMuted: '--text-muted',
  textSecondary: '--text-secondary',
  warning: '--warning',
  success: '--success',
  danger: '--danger',
  info: '--info',
  borderWarning: '--border-warning',
  borderDanger: '--border-danger',
  borderInfo: '--border-info',
  chartPrimary: '--chart-primary',
  chartPrimarySoft: '--chart-primary-soft',
  chartSecondary: '--chart-secondary',
  chartTertiary: '--chart-tertiary',
  chartTooltipBg: '--chart-tooltip-bg',
};

const THEME_OVERRIDE_TOKEN_MAP = new Map(Object.entries(THEME_OVERRIDE_CSS_VARS));

const DEFAULT_THEME_SEED = {
  primary: '#9759ef',
  secondary: '#e9e9ed',
  tertiary: '#1e1e1e',
  textPrimary: '#2f3543',
  textSecondary: '#2d313b',
} satisfies Pick<
  TenantThemeSettings,
  'primary' | 'secondary' | 'tertiary' | 'textPrimary' | 'textSecondary'
>;

function expandHex(value: string): string {
  const normalized = value.trim();
  if (!HEX_COLOR_REGEX.test(normalized)) {
    return '#000000';
  }

  if (normalized.length === 4) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }

  return normalized.toLowerCase();
}

function readThemeColor(input: Record<string, string>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = input[key];
    if (
      typeof value === 'string' &&
      value.trim().length > 0 &&
      HEX_COLOR_REGEX.test(value.trim())
    ) {
      return expandHex(value);
    }
  }

  return expandHex(fallback);
}

function hexToRgb(value: string) {
  const hex = expandHex(value);
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const channelToHex = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, '0');

  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

function mixHex(base: string, target: string, weight: number) {
  const from = hexToRgb(base);
  const to = hexToRgb(target);
  return rgbToHex(
    from.r + (to.r - from.r) * weight,
    from.g + (to.g - from.g) * weight,
    from.b + (to.b - from.b) * weight,
  );
}

function lightenHex(value: string, amount: number) {
  return mixHex(value, '#ffffff', amount);
}

function darkenHex(value: string, amount: number) {
  return mixHex(value, '#000000', amount);
}

function withAlpha(value: string, alpha: number) {
  const { r, g, b } = hexToRgb(value);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getRelativeLuminance(value: string) {
  const { r, g, b } = hexToRgb(value);
  const [red, green, blue] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function ensureReadableText(
  background: string,
  preferred: string,
  fallbackLight = '#ffffff',
  fallbackDark = '#111827',
) {
  if (contrastRatio(preferred, background) >= 4.5) {
    return preferred;
  }

  return contrastRatio(fallbackLight, background) >= contrastRatio(fallbackDark, background)
    ? fallbackLight
    : fallbackDark;
}

function deriveSidebarHover(baseSidebarColor: string) {
  const luminance = getRelativeLuminance(baseSidebarColor);
  if (luminance < 0.28) {
    return lightenHex(baseSidebarColor, 0.14);
  }

  return darkenHex(baseSidebarColor, 0.16);
}

export function normalizeThemeSettings(input: unknown): TenantThemeSettings {
  const theme = input && typeof input === 'object' ? (input as Record<string, string>) : {};

  const primary = readThemeColor(theme, ['primary', 'primaryAccent'], DEFAULT_THEME_SEED.primary);
  const secondary = readThemeColor(
    theme,
    ['secondary', 'cardBg', 'shellBg', 'navbarBg'],
    DEFAULT_THEME_SEED.secondary,
  );
  const tertiary = readThemeColor(
    theme,
    ['tertiary', 'sidebarBgStart', 'appBg'],
    DEFAULT_THEME_SEED.tertiary,
  );
  const textPrimary = readThemeColor(
    theme,
    ['textPrimary', 'textBody', 'primaryAccentText', 'textSecondary'],
    DEFAULT_THEME_SEED.textPrimary,
  );
  const textSecondary = readThemeColor(
    theme,
    ['textSecondary', 'textMuted', 'textTertiary', 'iconButtonText', 'textPrimary'],
    DEFAULT_THEME_SEED.textSecondary,
  );

  return {
    primary,
    secondary,
    tertiary,
    primaryHover: darkenHex(primary, 0.12),
    secondaryHover: lightenHex(secondary, 0.14),
    tertiaryHover: deriveSidebarHover(tertiary),
    textPrimary,
    textSecondary,
    textTertiary: mixHex(textSecondary, secondary, 0.35),
  };
}

export function normalizeThemeMode(input: unknown): TenantThemeMode {
  return input === 'ADVANCED' ? 'ADVANCED' : 'AUTO';
}

export function normalizeThemeOverrides(input: unknown): TenantThemeOverrides {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const entries = Object.entries(input).filter(
    ([key, value]) => key.trim().length > 0 && typeof value === 'string' && value.trim().length > 0,
  );

  return Object.fromEntries(entries);
}

function resolveOverrideCssVariable(token: string): string | null {
  if (!token.trim()) return null;
  if (token.startsWith('--')) return token;
  return THEME_OVERRIDE_TOKEN_MAP.get(token) ?? null;
}

export function createThemeVariables(
  theme: TenantThemeSettings,
  themeMode: TenantThemeMode = 'AUTO',
  themeOverrides: TenantThemeOverrides = {},
): ThemeVariableMap {
  const normalizedTheme = normalizeThemeSettings(theme);
  const sidebarText = ensureReadableText(normalizedTheme.tertiary, '#ffffff');
  const accentText = ensureReadableText(
    normalizedTheme.primary,
    '#ffffff',
    '#ffffff',
    normalizedTheme.textPrimary,
  );

  const surface = lightenHex(normalizedTheme.secondary, 0.88);
  const surfaceSoft = lightenHex(normalizedTheme.secondary, 0.74);
  const surfaceMuted = lightenHex(normalizedTheme.secondary, 0.6);
  const surfaceSubtle = lightenHex(normalizedTheme.secondary, 0.5);
  const panelSurface = lightenHex(normalizedTheme.secondary, 0.34);
  const panelSurfaceStrong = lightenHex(normalizedTheme.secondary, 0.42);
  const warningSurface = lightenHex(normalizedTheme.primary, 0.86);
  const warningSurfaceSoft = lightenHex(normalizedTheme.primary, 0.92);
  const warningBorder = lightenHex(normalizedTheme.primary, 0.7);
  const textBody = ensureReadableText(
    surface,
    normalizedTheme.textPrimary,
    '#111827',
    normalizedTheme.textPrimary,
  );
  const textStrong = darkenHex(textBody, 0.12);
  const textSecondary = ensureReadableText(
    surface,
    normalizedTheme.textSecondary,
    normalizedTheme.textSecondary,
    textBody,
  );
  const textMuted = mixHex(textSecondary, normalizedTheme.secondary, 0.34);
  const textPlaceholder = mixHex(textMuted, normalizedTheme.secondary, 0.2);
  const chartPrimary = mixHex(normalizedTheme.primary, '#b8841f', 0.32);
  const chartPrimarySoft = mixHex(normalizedTheme.primary, '#dfb34d', 0.46);
  const chartSecondary = mixHex(textSecondary, normalizedTheme.secondary, 0.18);
  const chartTertiary = mixHex(textMuted, normalizedTheme.secondary, 0.34);
  const chartAxis = mixHex(textMuted, normalizedTheme.secondary, 0.18);
  const chartGrid = withAlpha(textMuted, 0.18);
  const chartCursor = withAlpha(textSecondary, 0.2);
  const infoTone = '#295693';
  const dangerTone = '#ab3d3d';
  const shadowSoft = `0 18px 40px ${withAlpha(normalizedTheme.tertiary, 0.12)}`;
  const shadowSoftSm = `0 8px 24px ${withAlpha(normalizedTheme.tertiary, 0.1)}`;
  const shadowCard = `0 20px 44px ${withAlpha(normalizedTheme.tertiary, 0.09)}`;
  const shadowShell = `0 18px 45px ${withAlpha(normalizedTheme.tertiary, 0.16)}`;
  const shadowRow = `0 12px 30px ${withAlpha(normalizedTheme.tertiary, 0.07)}`;
  const shadowAccent = `0 12px 24px ${withAlpha(normalizedTheme.primary, 0.26)}`;
  const shadowAccentSm = `0 10px 24px ${withAlpha(normalizedTheme.primary, 0.18)}`;
  const shadowInfo = `0 12px 24px ${withAlpha(infoTone, 0.24)}`;
  const shadowDanger = `0 12px 24px ${withAlpha(dangerTone, 0.26)}`;
  const shadowModal = `0 28px 80px ${withAlpha(normalizedTheme.tertiary, 0.24)}`;
  const shadowModalLg = `0 30px 90px ${withAlpha(normalizedTheme.tertiary, 0.22)}`;
  const shadowInsetLight = `inset 0 1px 0 ${withAlpha('#ffffff', 0.12)}`;

  const baseVariables: ThemeVariableMap = {
    '--app-bg': mixHex(normalizedTheme.secondary, normalizedTheme.tertiary, 0.08),
    '--shell-bg': lightenHex(normalizedTheme.secondary, 0.08),
    '--sidebar-bg-start': normalizedTheme.tertiary,
    '--sidebar-bg-end': normalizedTheme.tertiaryHover,
    '--sidebar-hover-bg': normalizedTheme.tertiaryHover,
    '--sidebar-active-bg': normalizedTheme.primary,
    '--sidebar-active-text': accentText,
    '--sidebar-text': sidebarText,
    '--navbar-bg': lightenHex(normalizedTheme.secondary, 0.16),
    '--navbar-border': withAlpha(textMuted, 0.22),
    '--icon-button-bg': lightenHex(normalizedTheme.secondary, 0.24),
    '--icon-button-border': withAlpha(textMuted, 0.24),
    '--icon-button-text': textSecondary,
    '--icon-button-hover': normalizedTheme.secondaryHover,
    '--card-bg': lightenHex(normalizedTheme.secondary, 0.34),
    '--card-border': withAlpha(textMuted, 0.18),
    '--text-primary': textBody,
    '--text-muted': textMuted,
    '--primary-accent': normalizedTheme.primary,
    '--primary-hover': normalizedTheme.primaryHover,
    '--primary-accent-text': accentText,
    '--secondary-hover': normalizedTheme.secondaryHover,
    '--tertiary-hover': normalizedTheme.tertiaryHover,
    '--surface': surface,
    '--surface-soft': surfaceSoft,
    '--surface-muted': surfaceMuted,
    '--surface-subtle': surfaceSubtle,
    '--surface-panel': panelSurface,
    '--surface-panel-strong': panelSurfaceStrong,
    '--surface-warm': lightenHex(normalizedTheme.primary, 0.9),
    '--surface-warning': warningSurface,
    '--surface-warning-soft': warningSurfaceSoft,
    '--surface-success': '#edf8f2',
    '--surface-danger': '#fff5f5',
    '--surface-danger-soft': '#fff4f4',
    '--surface-info': '#f2f7ff',
    '--border': withAlpha(textMuted, 0.28),
    '--border-soft': withAlpha(textMuted, 0.16),
    '--border-strong': withAlpha(textMuted, 0.34),
    '--border-warning': warningBorder,
    '--border-danger': '#f2d4d4',
    '--border-success': '#cde7da',
    '--border-info': '#dce8fb',
    '--text-strong': textStrong,
    '--text-label': textSecondary,
    '--text-body': textBody,
    '--text-secondary': textSecondary,
    '--text-icon': textSecondary,
    '--text-placeholder': textPlaceholder,
    '--text-soft': textMuted,
    '--warning': ensureReadableText(
      warningSurface,
      darkenHex(normalizedTheme.primary, 0.45),
      '#7a5c08',
      textBody,
    ),
    '--success': '#1f7a4d',
    '--danger': dangerTone,
    '--info': infoTone,
    '--neutral': textSecondary,
    '--overlay': withAlpha(normalizedTheme.tertiary, 0.44),
    '--overlay-strong': withAlpha(normalizedTheme.tertiary, 0.5),
    '--overlay-soft': withAlpha(normalizedTheme.tertiary, 0.3),
    '--overlay-muted': withAlpha(normalizedTheme.tertiary, 0.18),
    '--inverse': ensureReadableText(normalizedTheme.tertiary, '#ffffff'),
    '--inverse-95': withAlpha('#ffffff', 0.95),
    '--inverse-80': withAlpha('#ffffff', 0.8),
    '--inverse-75': withAlpha('#ffffff', 0.75),
    '--inverse-70': withAlpha('#ffffff', 0.7),
    '--inverse-60': withAlpha('#ffffff', 0.6),
    '--inverse-20': withAlpha('#ffffff', 0.2),
    '--inverse-15': withAlpha('#ffffff', 0.15),
    '--inverse-10': withAlpha('#ffffff', 0.1),
    '--chart-primary': chartPrimary,
    '--chart-primary-soft': chartPrimarySoft,
    '--chart-secondary': chartSecondary,
    '--chart-tertiary': chartTertiary,
    '--chart-grid': chartGrid,
    '--chart-axis': chartAxis,
    '--chart-cursor': chartCursor,
    '--chart-tooltip-bg': surface,
    '--chart-tooltip-border': withAlpha(textMuted, 0.24),
    '--shadow-soft': shadowSoft,
    '--shadow-soft-sm': shadowSoftSm,
    '--shadow-card': shadowCard,
    '--shadow-shell': shadowShell,
    '--shadow-row': shadowRow,
    '--shadow-accent': shadowAccent,
    '--shadow-accent-sm': shadowAccentSm,
    '--shadow-info': shadowInfo,
    '--shadow-danger': shadowDanger,
    '--shadow-modal': shadowModal,
    '--shadow-modal-lg': shadowModalLg,
    '--shadow-inset-light': shadowInsetLight,
  };

  if (normalizeThemeMode(themeMode) !== 'ADVANCED') {
    return baseVariables;
  }

  const normalizedOverrides = normalizeThemeOverrides(themeOverrides);
  const variablesWithOverrides = { ...baseVariables };

  Object.entries(normalizedOverrides).forEach(([token, value]) => {
    const cssVar = resolveOverrideCssVariable(token);
    if (!cssVar) return;
    variablesWithOverrides[cssVar] = value;
  });

  return variablesWithOverrides;
}
