export interface LoginPayload {
  email: string;
  password: string;
  captcha_token?: string;
}

export interface RequestPasswordResetPayload {
  email: string;
}

export interface ResolvePasswordResetPayload {
  token: string;
}

export interface CompletePasswordResetPayload {
  token: string;
  password: string;
}

export interface ResolveTenantAdminOnboardingPayload {
  token: string;
}

export interface CompleteTenantAdminOnboardingPayload {
  token: string;
  name: string;
  password: string;
}

export interface AuthAccessTokenResponse {
  access_token: string;
}

export interface AuthMfaChallengeResponse {
  mfa_required: true;
  challenge_token: string;
  expires_at: string;
  user: {
    email: string;
    name: string;
    role: 'SUPER_ADMIN' | 'TENANT_ADMIN';
  };
}

export type LoginResponse = AuthAccessTokenResponse | AuthMfaChallengeResponse;
export type RefreshResponse = AuthAccessTokenResponse;

export interface CompleteMfaLoginPayload {
  challenge_token: string;
  code?: string;
  recovery_code?: string;
}

export interface LogoutResponse {
  success: true;
}

export interface LogoutAllResponse {
  success: true;
  revoked_sessions: number;
}

export interface GenericSuccessResponse {
  success: true;
}

export interface ResolvePasswordResetResponse {
  email: string;
  name: string;
  expires_at: string;
}

export interface CompletePasswordResetResponse {
  success: true;
  email: string;
}

export interface ResolveTenantAdminOnboardingResponse {
  email: string;
  name: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  expires_at: string;
  email_verified_at: string;
}

export interface CompleteTenantAdminOnboardingResponse {
  success: true;
  email: string;
}

export interface MfaStatusResponse {
  enabled: boolean;
  enabled_at: string | null;
  last_used_at: string | null;
  recovery_codes_remaining: number;
  pending_setup_expires_at: string | null;
}

export interface MfaSetupResponse {
  secret: string;
  otpauth_url: string;
  expires_at: string;
}

export interface MfaEnableResponse {
  success: true;
  enabled_at: string;
  recovery_codes: string[];
}

export interface MfaDisableResponse {
  success: true;
  revoked_sessions: number;
}

export interface MfaRecoveryCodesResponse {
  success: true;
  recovery_codes: string[];
}

export interface AuthSessionItem {
  id: string;
  current: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
}

export interface AuthSessionsResponse {
  sessions: AuthSessionItem[];
}
