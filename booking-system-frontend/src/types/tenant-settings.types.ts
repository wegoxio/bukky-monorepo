export type TenantThemeSettings = {
  primary: string;
  secondary: string;
  tertiary: string;
  primaryHover: string;
  secondaryHover: string;
  tertiaryHover: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
};

export type TenantThemeMode = 'AUTO' | 'ADVANCED';

export type TenantThemeOverrides = Record<string, string>;

export type TenantBrandingSettings = {
  appName: string;
  windowTitle: string;
  logoUrl: string;
  faviconUrl: string;
};

export type TenantSettings = {
  theme: TenantThemeSettings;
  themeMode: TenantThemeMode;
  themeOverrides: TenantThemeOverrides;
  branding: TenantBrandingSettings;
};

export type TenantSettingsRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id?: string | null;
  scope?: string;
  business?: {
    id: string;
    name: string;
    slug: string;
  };
  theme: TenantThemeSettings;
  themeMode: TenantThemeMode;
  themeOverrides: TenantThemeOverrides;
  branding: TenantBrandingSettings;
  logo_key: string | null;
  favicon_key: string | null;
};

export type UpdateTenantSettingsPayload = {
  theme?: Partial<TenantThemeSettings>;
  themeMode?: TenantThemeMode;
  themeOverrides?: TenantThemeOverrides;
  branding?: Partial<TenantBrandingSettings>;
};
