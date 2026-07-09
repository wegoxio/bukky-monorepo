import {
  clearSessionTokens,
  getAccessToken,
  getCsrfToken,
  setAccessToken,
  syncCsrfTokenFromCookie,
} from '@/modules/auth/services/auth-session.service';
import type { RefreshResponse } from '@/types/auth.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const CSRF_HEADER_NAME = process.env.NEXT_PUBLIC_AUTH_CSRF_HEADER_NAME?.trim() || 'x-csrf-token';

if (!API_URL) {
  throw new Error('Falta NEXT_PUBLIC_API_URL en las variables de entorno');
}

type RequestOptions = RequestInit & {
  token?: string;
  skipAuthRefresh?: boolean;
  responseType?: 'auto' | 'json' | 'text' | 'blob';
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshInFlight: Promise<string | null> | null = null;

const CONNECTION_ERROR_MESSAGE =
  'No pudimos conectar con el servidor. Intenta nuevamente en unos segundos.';

const REQUEST_TIMEOUT_MESSAGE =
  'La solicitud tardó demasiado. Revisa tu conexión e intenta otra vez.';

const GENERIC_ERROR_MESSAGE = 'No pudimos completar la operación. Intenta nuevamente.';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function toFriendlyNetworkError(error: unknown): ApiError {
  if (isAbortError(error)) {
    return new ApiError(REQUEST_TIMEOUT_MESSAGE, 0);
  }

  return new ApiError(CONNECTION_ERROR_MESSAGE, 0);
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw toFriendlyNetworkError(error);
  }
}

function statusToFriendlyMessage(status: number, statusText: string): string {
  if (status === 400) return 'Revisa los datos ingresados e intenta nuevamente.';
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permisos para realizar esta acción.';
  if (status === 404) return 'No encontramos la información solicitada.';
  if (status === 409) return 'La operación no se pudo completar por un conflicto de datos.';
  if (status === 422) return 'Hay datos inválidos. Corrígelos e intenta nuevamente.';
  if (status === 429) return 'Demasiados intentos. Espera un momento e intenta nuevamente.';
  if (status >= 500) return 'El servidor tuvo un problema. Intenta nuevamente en unos minutos.';

  return statusText?.trim() ? GENERIC_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE;
}

function normalizeApiMessage(message: unknown, status: number, statusText: string): string {
  if (Array.isArray(message)) {
    const joined = message
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ');
    return joined || statusToFriendlyMessage(status, statusText);
  }

  if (typeof message !== 'string') {
    return statusToFriendlyMessage(status, statusText);
  }

  const normalized = message.trim();
  if (!normalized) {
    return statusToFriendlyMessage(status, statusText);
  }

  const technicalPatterns = [
    /networkerror/i,
    /failed to fetch/i,
    /fetch resource/i,
    /load failed/i,
    /cors/i,
    /http status/i,
    /internal server error/i,
    /bad gateway/i,
    /gateway timeout/i,
    /service unavailable/i,
    /^error\s+\d{3}/i,
  ];

  if (technicalPatterns.some((pattern) => pattern.test(normalized))) {
    return statusToFriendlyMessage(status, statusText);
  }

  return normalized;
}

function buildHeaders(
  headers: HeadersInit | undefined,
  token: string | null,
  csrfToken: string | null,
  isFormData: boolean,
): HeadersInit {
  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
    ...headers,
  };
}

function shouldTryRefresh(endpoint: string): boolean {
  const normalized = endpoint.toLowerCase();
  return !normalized.startsWith('/auth/login') && !normalized.startsWith('/auth/refresh');
}

async function requestFreshTokens(): Promise<string | null> {
  const executeRefresh = async (csrfToken: string | null) =>
    safeFetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : undefined,
    });

  const initialCsrfToken = syncCsrfTokenFromCookie() ?? getCsrfToken();
  let response = await executeRefresh(initialCsrfToken);

  if (!response.ok && (response.status === 401 || response.status === 403)) {
    const syncedCookieToken = syncCsrfTokenFromCookie();
    if (syncedCookieToken && syncedCookieToken !== initialCsrfToken) {
      response = await executeRefresh(syncedCookieToken);
    }
  }

  if (!response.ok) {
    clearSessionTokens();
    return null;
  }

  const data = (await response.json()) as RefreshResponse;
  if (!data?.access_token) {
    clearSessionTokens();
    return null;
  }

  setAccessToken(data.access_token);
  syncCsrfTokenFromCookie();
  return data.access_token;
}

export async function refreshAccessTokenWithStoredRefreshToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = requestFreshTokens().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function parseErrorMessage(response: Response): Promise<string> {
  const errorData = await response.json().catch(() => null);
  return normalizeApiMessage(errorData?.message, response.status, response.statusText);
}

export async function apiFetch<t>(endpoint: string, options: RequestOptions = {}): Promise<t> {
  const { token, headers, skipAuthRefresh, responseType = 'auto', ...restOptions } = options;
  const isFormData = typeof FormData !== 'undefined' && restOptions.body instanceof FormData;

  const executeRequest = async (resolvedToken: string | null): Promise<Response> => {
    const csrfToken = getCsrfToken();

    return safeFetch(`${API_URL}${endpoint}`, {
      ...restOptions,
      cache: restOptions.cache ?? 'no-store',
      credentials: restOptions.credentials ?? 'include',
      headers: buildHeaders(headers, resolvedToken, csrfToken, isFormData),
    });
  };

  const initialToken = token ?? getAccessToken();
  let response = await executeRequest(initialToken);

  const canRetryWithRefresh =
    response.status === 401 && !skipAuthRefresh && shouldTryRefresh(endpoint);

  if (canRetryWithRefresh) {
    const refreshedAccessToken = await refreshAccessTokenWithStoredRefreshToken();
    if (refreshedAccessToken) {
      response = await executeRequest(refreshedAccessToken);
    }
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as t;
  }

  if (responseType === 'blob') {
    return response.blob() as t;
  }

  if (responseType === 'text') {
    return response.text() as t;
  }

  if (responseType === 'json') {
    return response.json();
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return response.text() as t;
}
