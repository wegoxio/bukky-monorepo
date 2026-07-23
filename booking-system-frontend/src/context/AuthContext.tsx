'use client';

import { authService } from '@/modules/auth/services/auth.service';
import {
  clearSessionTokens,
  getAccessToken,
  onAccessTokenChange,
  setAccessToken,
  syncCsrfTokenFromCookie,
} from '@/modules/auth/services/auth-session.service';
import { refreshAccessTokenWithStoredRefreshToken } from '@/modules/http/services/api';
import { queueOnboardingAutoStart } from '@/modules/onboarding/utils/onboarding-auto-start';
import {
  AuthMfaChallengeResponse,
  CompleteMfaLoginPayload,
  LoginPayload,
} from '@/types/auth.types';
import { User } from '@/types/user.types';
import { toast } from 'react-hot-toast';
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

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<AuthMfaChallengeResponse | null>;
  completeMfaLogin: (data: CompleteMfaLoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllSessions: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const hasInitializedRef = useRef(false);

  const completeAccessLogin = useCallback(
    async (accessToken: string, options?: { autoStartOnboarding?: boolean }) => {
      setAccessToken(accessToken);
      syncCsrfTokenFromCookie();

      const me = await authService.getAuthenticatedUser(accessToken);
      if (options?.autoStartOnboarding) {
        queueOnboardingAutoStart(me.id);
      }
      setUser(me);
      toast.success(`Bienvenido, ${me.name}.`);
    },
    [],
  );

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // No bloqueamos logout local si backend no responde.
    } finally {
      clearSessionTokens();
      setUser(null);
      setIsLoggingOut(false);
      toast.success('Sesión cerrada.');
    }
  }, []);

  const logoutAllSessions = useCallback(async () => {
    const activeToken = getAccessToken();
    if (!activeToken) {
      await logout();
      return;
    }

    setIsLoggingOut(true);
    try {
      await authService.logoutAll(activeToken);
      clearSessionTokens();
      setUser(null);
      toast.success('Todas las sesiones fueron cerradas.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron cerrar todas las sesiones.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout]);

  const login = useCallback(
    async ({ email, password, captcha_token }: LoginPayload) => {
      setIsLoading(true);
      try {
        const response = await authService.login({
          email,
          password,
          captcha_token,
        });

        if ('mfa_required' in response) {
          toast.success('Verifica tu identidad para continuar.');
          return response;
        }

        await completeAccessLogin(response.access_token, {
          autoStartOnboarding: response.first_login === true,
        });
        return null;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [completeAccessLogin],
  );

  const completeMfaLogin = useCallback(
    async (payload: CompleteMfaLoginPayload) => {
      setIsLoading(true);
      try {
        const response = await authService.completeMfaLogin(payload);
        await completeAccessLogin(response.access_token, {
          autoStartOnboarding: response.first_login === true,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo verificar el código.';
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [completeAccessLogin],
  );

  const refreshUser = useCallback(async () => {
    const activeToken = getAccessToken();
    if (!activeToken) return;

    const me = await authService.getAuthenticatedUser(activeToken);
    setUser(me);
  }, []);

  useEffect(() => {
    const unsubscribe = onAccessTokenChange((nextToken) => {
      setToken(nextToken);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshedAccessToken = await refreshAccessTokenWithStoredRefreshToken();

        if (!refreshedAccessToken) {
          setUser(null);
          setIsLoading(false);
          hasInitializedRef.current = true;
          return;
        }

        const me = await authService.getAuthenticatedUser(refreshedAccessToken);
        setUser(me);
      } catch (error) {
        console.error('Error restaurando sesión:', error);
        clearSessionTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
        hasInitializedRef.current = true;
      }
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (isLoading || isLoggingOut) return;
    if (!token && user) {
      setUser(null);
      toast.error('Sesión expirada. Inicia sesión nuevamente.');
    }
  }, [isLoading, isLoggingOut, token, user]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      completeMfaLogin,
      logout,
      logoutAllSessions,
      refreshUser,
    }),
    [user, token, isLoading, login, completeMfaLogin, logout, logoutAllSessions, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
