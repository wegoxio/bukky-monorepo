'use client';

import { useAuth } from '@/context/AuthContext';
import { defaultTenantSettings } from '@/modules/settings/config/default-tenant-settings';
import { applyDocumentBranding } from '@/modules/settings/utils/document-branding';
import {
  tenantSettingsService,
  type TenantSettingsAssetType,
} from '@/modules/settings/services/tenant-settings.service';
import {
  createThemeVariables,
  normalizeThemeMode,
  normalizeThemeOverrides,
  normalizeThemeSettings,
} from '@/modules/settings/utils/theme-colors';
import type {
  TenantBrandingSettings,
  TenantSettings,
  TenantSettingsRecord,
  TenantThemeMode,
  TenantThemeOverrides,
  TenantThemeSettings,
  UpdateTenantSettingsPayload,
} from '@/types/tenant-settings.types';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

type TenantSettingsContextType = {
  settings: TenantSettings;
  canEditTenantSettings: boolean;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  errorMessage: string;
  refreshSettings: () => Promise<void>;
  saveSettings: (payload: UpdateTenantSettingsPayload) => Promise<void>;
  updateTheme: (patch: Partial<TenantThemeSettings>) => Promise<void>;
  updateBranding: (patch: Partial<TenantBrandingSettings>) => Promise<void>;
  uploadBrandingAsset: (assetType: TenantSettingsAssetType, file: File) => Promise<void>;
  resetSettings: () => Promise<void>;
};

const TenantSettingsContext = createContext<TenantSettingsContextType | undefined>(undefined);

function mergeWithDefaults(input: unknown): TenantSettings {
  if (!input || typeof input !== 'object') {
    return defaultTenantSettings;
  }

  const parsed = input as Partial<TenantSettings>;
  return {
    theme: normalizeThemeSettings(parsed.theme),
    themeMode: normalizeThemeMode(parsed.themeMode),
    themeOverrides: normalizeThemeOverrides(parsed.themeOverrides),
    branding: {
      ...defaultTenantSettings.branding,
      ...(parsed.branding ?? {}),
    },
  };
}

function toTenantSettings(record: TenantSettingsRecord): TenantSettings {
  return mergeWithDefaults({
    theme: record.theme,
    themeMode: record.themeMode,
    themeOverrides: record.themeOverrides,
    branding: record.branding,
  });
}

function applyThemeVariables(
  theme: TenantThemeSettings,
  themeMode: TenantThemeMode,
  themeOverrides: TenantThemeOverrides,
) {
  const root = document.documentElement;
  const variables = createThemeVariables(theme, themeMode, themeOverrides);
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

type PersistTarget =
  | {
      mode: 'mine';
    }
  | {
      mode: 'platform';
    };

export function TenantSettingsProvider({ children }: { children: ReactNode }) {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const pathname = usePathname();
  const [settings, setSettings] = useState<TenantSettings>(defaultTenantSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const requestIdRef = useRef(0);

  const canEditTenantSettings = user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    applyThemeVariables(settings.theme, settings.themeMode, settings.themeOverrides);
    applyDocumentBranding({
      title: settings.branding.windowTitle,
      faviconUrl: settings.branding.faviconUrl,
    });
  }, [pathname, settings]);

  const resolvePersistTarget = useCallback((): PersistTarget | null => {
    if (!user) return null;

    if (user.role === 'TENANT_ADMIN') {
      return user.tenant_id ? { mode: 'mine' } : null;
    }

    if (user.role === 'SUPER_ADMIN') {
      return { mode: 'platform' };
    }

    return null;
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (isAuthLoading) return;

    if (!token || !canEditTenantSettings) {
      setSettings(defaultTenantSettings);
      return;
    }

    const target = resolvePersistTarget();
    if (!target) {
      setSettings(defaultTenantSettings);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoadingSettings(true);
    setErrorMessage('');

    try {
      const record =
        target.mode === 'mine'
          ? await tenantSettingsService.findMine(token)
          : await tenantSettingsService.findPlatform(token);

      if (requestId !== requestIdRef.current) return;
      setSettings(toTenantSettings(record));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar la configuración del negocio.';
      setErrorMessage(message);
      setSettings(defaultTenantSettings);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingSettings(false);
      }
    }
  }, [isAuthLoading, token, canEditTenantSettings, resolvePersistTarget]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const persistPatch = useCallback(
    async (payload: UpdateTenantSettingsPayload, optimisticSettings: TenantSettings) => {
      if (!token) {
        throw new Error('No hay una sesión activa.');
      }

      const target = resolvePersistTarget();
      if (!target) {
        throw new Error(
          user?.role === 'SUPER_ADMIN'
            ? 'No se encontró el contexto de configuración global.'
            : 'No hay un negocio asociado para editar la configuración.',
        );
      }

      const previousSettings = settings;
      setSettings(optimisticSettings);
      setIsSavingSettings(true);
      setErrorMessage('');

      try {
        const updatedRecord =
          target.mode === 'mine'
            ? await tenantSettingsService.updateMine(payload, token)
            : await tenantSettingsService.updatePlatform(payload, token);
        setSettings(toTenantSettings(updatedRecord));
      } catch (error) {
        setSettings(previousSettings);
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la configuración del negocio.';
        setErrorMessage(message);
        throw error;
      } finally {
        setIsSavingSettings(false);
      }
    },
    [resolvePersistTarget, settings, token, user?.role],
  );

  const updateTheme = useCallback(
    async (patch: Partial<TenantThemeSettings>) => {
      const optimisticSettings: TenantSettings = {
        ...settings,
        theme: {
          ...settings.theme,
          ...patch,
        },
      };
      await persistPatch({ theme: patch }, optimisticSettings);
    },
    [settings, persistPatch],
  );

  const updateBranding = useCallback(
    async (patch: Partial<TenantBrandingSettings>) => {
      const optimisticSettings: TenantSettings = {
        ...settings,
        branding: {
          ...settings.branding,
          ...patch,
        },
      };
      await persistPatch({ branding: patch }, optimisticSettings);
    },
    [settings, persistPatch],
  );

  const uploadBrandingAsset = useCallback(
    async (assetType: TenantSettingsAssetType, file: File) => {
      if (!token) {
        throw new Error('No hay una sesión activa.');
      }

      const target = resolvePersistTarget();
      if (!target) {
        throw new Error(
          user?.role === 'SUPER_ADMIN'
            ? 'No se encontró el contexto de configuración global.'
            : 'No hay un negocio asociado para subir archivos.',
        );
      }

      setIsSavingSettings(true);
      setErrorMessage('');
      try {
        const updatedRecord =
          target.mode === 'mine'
            ? await tenantSettingsService.uploadMineAsset(assetType, file, token)
            : await tenantSettingsService.uploadPlatformAsset(assetType, file, token);

        setSettings(toTenantSettings(updatedRecord));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo subir el archivo.';
        setErrorMessage(message);
        throw error;
      } finally {
        setIsSavingSettings(false);
      }
    },
    [resolvePersistTarget, token, user?.role],
  );

  const resetSettings = useCallback(async () => {
    const optimisticSettings = mergeWithDefaults(defaultTenantSettings);
    await persistPatch(
      {
        theme: { ...defaultTenantSettings.theme },
        themeMode: defaultTenantSettings.themeMode,
        themeOverrides: { ...defaultTenantSettings.themeOverrides },
        branding: { ...defaultTenantSettings.branding },
      },
      optimisticSettings,
    );
  }, [persistPatch]);

  const saveSettings = useCallback(
    async (payload: UpdateTenantSettingsPayload) => {
      const optimisticSettings = mergeWithDefaults({
        theme: {
          ...settings.theme,
          ...(payload.theme ?? {}),
        },
        themeMode: payload.themeMode ?? settings.themeMode,
        themeOverrides: payload.themeOverrides ?? settings.themeOverrides,
        branding: {
          ...settings.branding,
          ...(payload.branding ?? {}),
        },
      });

      await persistPatch(payload, optimisticSettings);
    },
    [persistPatch, settings],
  );

  const value = useMemo(
    () => ({
      settings,
      canEditTenantSettings,
      isLoadingSettings,
      isSavingSettings,
      errorMessage,
      refreshSettings: loadSettings,
      saveSettings,
      updateTheme,
      updateBranding,
      uploadBrandingAsset,
      resetSettings,
    }),
    [
      settings,
      canEditTenantSettings,
      isLoadingSettings,
      isSavingSettings,
      errorMessage,
      loadSettings,
      saveSettings,
      updateTheme,
      updateBranding,
      uploadBrandingAsset,
      resetSettings,
    ],
  );

  return <TenantSettingsContext.Provider value={value}>{children}</TenantSettingsContext.Provider>;
}

export function useTenantSettings() {
  const context = useContext(TenantSettingsContext);

  if (!context) {
    throw new Error('useTenantSettings debe usarse dentro de TenantSettingsProvider');
  }

  return context;
}
