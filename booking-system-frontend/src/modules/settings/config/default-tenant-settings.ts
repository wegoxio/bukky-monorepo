import type { TenantSettings } from '@/types/tenant-settings.types';
import { normalizeThemeSettings } from '@/modules/settings/utils/theme-colors';

export const defaultTenantSettings: TenantSettings = {
  theme: normalizeThemeSettings({
    primary: '#9759ef',
    secondary: '#e9e9ed',
    tertiary: '#1e1e1e',
    textPrimary: '#2f3543',
    textSecondary: '#2d313b',
  }),
  themeMode: 'AUTO',
  themeOverrides: {},
  branding: {
    appName: 'Bukky',
    windowTitle: 'Bukky Booking System',
    logoUrl: '/bukky-logo.svg',
    faviconUrl: '/favicon.ico',
  },
};
