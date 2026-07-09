import { apiFetch } from '@/modules/http/services/api';
import type {
  TenantSettingsRecord,
  UpdateTenantSettingsPayload,
} from '@/types/tenant-settings.types';

export type TenantSettingsAssetType = 'logo' | 'favicon';
type TenantSettingsAssetFormat = 'png' | 'jpg' | 'webp' | 'ico';

const ASSET_MAX_SIZE_BYTES: Record<TenantSettingsAssetType, number> = {
  logo: 2 * 1024 * 1024,
  favicon: 512 * 1024,
};

const ASSET_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

export const TENANT_SETTINGS_IMAGE_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.ico,image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon';

export function getTenantAssetMaxSizeLabel(assetType: TenantSettingsAssetType): string {
  const bytes = ASSET_MAX_SIZE_BYTES[assetType];
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => bytes[index] === byte);
}

function detectAssetFormat(bytes: Uint8Array): TenantSettingsAssetFormat | null {
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }

  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return 'jpg';
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'webp';
  }

  if (startsWithBytes(bytes, [0x00, 0x00, 0x01, 0x00])) {
    return 'ico';
  }

  return null;
}

function isMimeCompatibleWithFormat(mimeType: string, format: TenantSettingsAssetFormat): boolean {
  switch (format) {
    case 'png':
      return mimeType === 'image/png';
    case 'jpg':
      return mimeType === 'image/jpeg';
    case 'webp':
      return mimeType === 'image/webp';
    case 'ico':
      return mimeType === 'image/x-icon' || mimeType === 'image/vnd.microsoft.icon';
    default:
      return false;
  }
}

function includesSvgExtension(fileName: string): boolean {
  return fileName.trim().toLowerCase().endsWith('.svg');
}

export async function validateTenantSettingsAssetFile(
  assetType: TenantSettingsAssetType,
  file: File,
): Promise<void> {
  if (!file) {
    throw new Error('Debes seleccionar un archivo.');
  }

  const maxSizeBytes = ASSET_MAX_SIZE_BYTES[assetType];
  if (file.size > maxSizeBytes) {
    throw new Error(
      `Archivo demasiado grande para ${assetType}. Máximo permitido: ${getTenantAssetMaxSizeLabel(assetType)}.`,
    );
  }

  if (includesSvgExtension(file.name) || file.type.trim().toLowerCase() === 'image/svg+xml') {
    throw new Error('SVG no está permitido. Usa PNG, JPG, WEBP o ICO.');
  }

  const declaredMimeType = file.type.trim().toLowerCase();
  if (declaredMimeType && !ASSET_ALLOWED_MIME_TYPES.has(declaredMimeType)) {
    throw new Error('Tipo de archivo no soportado. Usa PNG, JPG, WEBP o ICO.');
  }

  const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detectedFormat = detectAssetFormat(headerBytes);

  if (!detectedFormat) {
    throw new Error('No se pudo validar el archivo. Formatos permitidos: PNG, JPG, WEBP, ICO.');
  }

  if (declaredMimeType && !isMimeCompatibleWithFormat(declaredMimeType, detectedFormat)) {
    throw new Error('El tipo MIME no coincide con el contenido real del archivo.');
  }
}

function createAssetFormData(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export const tenantSettingsService = {
  findPublicByBusinessSlug: async (businessSlug: string): Promise<TenantSettingsRecord> => {
    return apiFetch<TenantSettingsRecord>(
      `/public/businesses/${encodeURIComponent(businessSlug)}/settings`,
      {
        method: 'GET',
      },
    );
  },

  findPlatform: async (token: string): Promise<TenantSettingsRecord> => {
    return apiFetch<TenantSettingsRecord>('/tenant-settings/platform/me', {
      method: 'GET',
      token,
    });
  },

  updatePlatform: async (
    payload: UpdateTenantSettingsPayload,
    token: string,
  ): Promise<TenantSettingsRecord> => {
    return apiFetch<TenantSettingsRecord>('/tenant-settings/platform/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },

  uploadPlatformAsset: async (
    assetType: TenantSettingsAssetType,
    file: File,
    token: string,
  ): Promise<TenantSettingsRecord> => {
    await validateTenantSettingsAssetFile(assetType, file);

    return apiFetch<TenantSettingsRecord>(`/tenant-settings/platform/me/assets/${assetType}`, {
      method: 'POST',
      token,
      body: createAssetFormData(file),
    });
  },

  findMine: async (token: string): Promise<TenantSettingsRecord> => {
    return apiFetch<TenantSettingsRecord>('/tenant-settings/me', {
      method: 'GET',
      token,
    });
  },

  updateMine: async (
    payload: UpdateTenantSettingsPayload,
    token: string,
  ): Promise<TenantSettingsRecord> => {
    return apiFetch<TenantSettingsRecord>('/tenant-settings/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },

  uploadMineAsset: async (
    assetType: TenantSettingsAssetType,
    file: File,
    token: string,
  ): Promise<TenantSettingsRecord> => {
    await validateTenantSettingsAssetFile(assetType, file);

    return apiFetch<TenantSettingsRecord>(`/tenant-settings/me/assets/${assetType}`, {
      method: 'POST',
      token,
      body: createAssetFormData(file),
    });
  },

  findByTenantId: async (tenantId: string, token: string): Promise<TenantSettingsRecord> => {
    return apiFetch<TenantSettingsRecord>(`/tenant-settings/${tenantId}`, {
      method: 'GET',
      token,
    });
  },

  updateByTenantId: async (
    tenantId: string,
    payload: UpdateTenantSettingsPayload,
    token: string,
  ): Promise<TenantSettingsRecord> => {
    return apiFetch<TenantSettingsRecord>(`/tenant-settings/${tenantId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },

  uploadAssetByTenantId: async (
    tenantId: string,
    assetType: TenantSettingsAssetType,
    file: File,
    token: string,
  ): Promise<TenantSettingsRecord> => {
    await validateTenantSettingsAssetFile(assetType, file);

    return apiFetch<TenantSettingsRecord>(`/tenant-settings/${tenantId}/assets/${assetType}`, {
      method: 'POST',
      token,
      body: createAssetFormData(file),
    });
  },
};
