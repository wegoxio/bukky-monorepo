'use client';

import { useAuth } from '@/context/AuthContext';
import { authService } from '@/modules/auth/services/auth.service';
import Button from '@/modules/ui/Button';
import Input from '@/modules/ui/Input';
import { AuthSessionItem, MfaSetupResponse, MfaStatusResponse } from '@/types/auth.types';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  Laptop,
  LoaderCircle,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

function formatDateTime(value: string | null) {
  if (!value) return 'Sin actividad registrada';
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function summarizeDevice(userAgent: string | null) {
  const source = userAgent ?? '';
  if (/iphone|android.*mobile/i.test(source)) {
    return { label: 'Móvil', icon: Smartphone };
  }
  if (/ipad|tablet|android/i.test(source)) {
    return { label: 'Tablet', icon: MonitorSmartphone };
  }
  return { label: 'Equipo de escritorio', icon: Laptop };
}

function browserName(userAgent: string | null) {
  const source = userAgent ?? '';
  if (/firefox/i.test(source)) return 'Firefox';
  if (/edg/i.test(source)) return 'Edge';
  if (/chrome/i.test(source)) return 'Chrome';
  if (/safari/i.test(source)) return 'Safari';
  return 'Navegador';
}

function SecurityStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-fg-strong">{value}</p>
    </div>
  );
}

export default function SecuritySettingsPanel() {
  const { token } = useAuth();
  const [status, setStatus] = useState<MfaStatusResponse | null>(null);
  const [sessions, setSessions] = useState<AuthSessionItem[]>([]);
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [dangerCode, setDangerCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const mfaEnabled = !!status?.enabled;
  const currentSession = useMemo(() => sessions.find((session) => session.current), [sessions]);

  const loadSecurityState = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [nextStatus, nextSessions] = await Promise.all([
        authService.getMfaStatus(token),
        authService.listSessions(token),
      ]);
      setStatus(nextStatus);
      setSessions(nextSessions.sessions);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar la configuración de seguridad.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSecurityState();
  }, [loadSecurityState]);

  useEffect(() => {
    if (!setup?.otpauth_url) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(setup.otpauth_url, {
      margin: 1,
      width: 220,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(() => {
        setQrDataUrl('');
        toast.error('No se pudo generar el QR de configuración.');
      });
  }, [setup]);

  const startSetup = async () => {
    if (!token) return;
    setIsWorking(true);
    setRecoveryCodes([]);
    try {
      const response = await authService.startMfaSetup(token);
      setSetup(response);
      setVerificationCode('');
      toast.success('Escanea el QR con tu app autenticadora.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar MFA.');
    } finally {
      setIsWorking(false);
    }
  };

  const enableMfa = async () => {
    if (!token) return;
    setIsWorking(true);
    try {
      const response = await authService.enableMfa(token, verificationCode);
      setRecoveryCodes(response.recovery_codes);
      setSetup(null);
      setVerificationCode('');
      toast.success('Verificación en dos pasos activada.');
      await loadSecurityState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo activar MFA.');
    } finally {
      setIsWorking(false);
    }
  };

  const disableMfa = async () => {
    if (!token) return;
    setIsWorking(true);
    try {
      await authService.disableMfa(token, { code: dangerCode });
      setDangerCode('');
      setRecoveryCodes([]);
      toast.success('Verificación en dos pasos desactivada.');
      await loadSecurityState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo desactivar MFA.');
    } finally {
      setIsWorking(false);
    }
  };

  const regenerateRecoveryCodes = async () => {
    if (!token) return;
    setIsWorking(true);
    try {
      const response = await authService.regenerateRecoveryCodes(token, {
        code: dangerCode,
      });
      setRecoveryCodes(response.recovery_codes);
      setDangerCode('');
      toast.success('Códigos de recuperación regenerados.');
      await loadSecurityState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron regenerar los códigos.');
    } finally {
      setIsWorking(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!token) return;
    setIsWorking(true);
    try {
      await authService.revokeSession(token, sessionId);
      toast.success('Sesión cerrada.');
      await loadSecurityState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    } finally {
      setIsWorking(false);
    }
  };

  const revokeOtherSessions = async () => {
    if (!token) return;
    setIsWorking(true);
    try {
      const response = await authService.revokeOtherSessions(token);
      toast.success(`Sesiones cerradas: ${response.revoked_sessions}.`);
      await loadSecurityState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cerrar las sesiones.');
    } finally {
      setIsWorking(false);
    }
  };

  const copyRecoveryCodes = async () => {
    if (!recoveryCodes.length) return;
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success('Códigos copiados.');
  };

  return (
    <section data-tour="settings-security-section" className="space-y-5">
      <article
        data-tour="settings-security-header"
        className="overflow-hidden rounded-[28px] border border-card-border bg-card shadow-theme-card"
      >
        <div className="border-b border-border-soft bg-[linear-gradient(135deg,var(--surface)_0%,var(--surface-soft)_100%)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-fg-secondary">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Seguridad de la cuenta
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-fg-strong">
                MFA y control de sesiones
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-fg-secondary">
                Protege accesos de administradores con una app autenticadora y revisa desde dónde
                está abierta tu cuenta.
              </p>
            </div>
            <Button
              onClick={() => void loadSecurityState()}
              disabled={isLoading || isWorking}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-fg-strong shadow-theme-soft transition hover:border-accent disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-3">
          <SecurityStat
            label="Verificación en dos pasos"
            value={mfaEnabled ? 'Activa' : 'No configurada'}
          />
          <SecurityStat
            label="Sesiones activas"
            value={isLoading ? 'Cargando...' : String(sessions.length)}
          />
          <SecurityStat
            label="Sesión actual"
            value={browserName(currentSession?.user_agent ?? null)}
          />
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <article
          data-tour="settings-mfa-card"
          className="rounded-[28px] border border-card-border bg-card p-5 shadow-theme-card sm:p-6"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-card-border bg-surface p-3 text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-fg-strong">Verificación en dos pasos</h3>
              <p className="mt-1 text-sm text-fg-secondary">
                Requiere contraseña y un código temporal de una app autenticadora antes de crear la
                sesión.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                mfaEnabled ? 'bg-surface-success text-success' : 'bg-surface-warning text-warning'
              }`}
            >
              {mfaEnabled ? 'Activo' : 'Pendiente'}
            </span>
          </div>

          {isLoading ? (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border-soft bg-surface-soft p-4 text-sm text-fg-secondary">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando seguridad...
            </div>
          ) : null}

          {!mfaEnabled && !setup ? (
            <div className="mt-6 rounded-2xl border border-border-soft bg-surface-soft p-4">
              <p className="text-sm text-fg-secondary">
                Para activarlo necesitarás una app como Google Authenticator, Microsoft
                Authenticator, 1Password o Bitwarden.
              </p>
              <Button
                onClick={() => void startSetup()}
                disabled={isWorking}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-text shadow-theme-accent disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                Configurar MFA
              </Button>
            </div>
          ) : null}

          {!mfaEnabled && setup ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="rounded-3xl border border-border-soft bg-white p-4">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR para configurar MFA"
                    className="mx-auto h-55 w-55 rounded-2xl"
                  />
                ) : (
                  <div className="grid h-55 w-full place-items-center text-sm text-muted">
                    Generando QR...
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-soft bg-surface-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Clave manual
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold tracking-[0.14em] text-fg-strong">
                      {setup.secret}
                    </code>
                    <Button
                      onClick={() => {
                        void navigator.clipboard.writeText(setup.secret);
                        toast.success('Clave copiada.');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg-strong"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar
                    </Button>
                  </div>
                </div>
                <Input
                  id="mfaVerifyCode"
                  name="mfaVerifyCode"
                  label="Código de verificación"
                  placeholder="123456"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  className="h-12 tracking-[0.18em]"
                />
                <Button
                  onClick={() => void enableMfa()}
                  disabled={isWorking}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-text shadow-theme-accent disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Activar protección
                </Button>
              </div>
            </div>
          ) : null}

          {mfaEnabled ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <SecurityStat label="Activado" value={formatDateTime(status?.enabled_at ?? null)} />
                <SecurityStat
                  label="Último uso"
                  value={formatDateTime(status?.last_used_at ?? null)}
                />
                <SecurityStat
                  label="Códigos restantes"
                  value={String(status?.recovery_codes_remaining ?? 0)}
                />
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface-soft p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                  <p className="text-sm text-fg-secondary">
                    Para regenerar códigos o desactivar MFA, confirma primero un código actual de tu
                    app autenticadora.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <Input
                    id="mfaDangerCode"
                    name="mfaDangerCode"
                    label="Código actual"
                    placeholder="123456"
                    inputMode="numeric"
                    value={dangerCode}
                    onChange={(event) => setDangerCode(event.target.value)}
                    className="h-12 tracking-[0.18em]"
                  />
                  <Button
                    onClick={() => void regenerateRecoveryCodes()}
                    disabled={isWorking}
                    className="self-end rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg-strong transition hover:border-accent disabled:opacity-60"
                  >
                    Regenerar códigos
                  </Button>
                  <Button
                    onClick={() => void disableMfa()}
                    disabled={isWorking}
                    className="inline-flex items-center justify-center gap-2 self-end rounded-xl border border-border-danger bg-surface-danger px-4 py-3 text-sm font-semibold text-danger disabled:opacity-60"
                  >
                    <ShieldOff className="h-4 w-4" />
                    Desactivar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {recoveryCodes.length ? (
            <div className="mt-6 rounded-2xl border border-border-warning bg-surface-warning p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="font-semibold text-fg-strong">
                    Guarda estos códigos de recuperación
                  </h4>
                  <p className="mt-1 text-sm text-fg-secondary">
                    Se muestran una sola vez. Úsalos si pierdes acceso a tu app autenticadora.
                  </p>
                </div>
                <Button
                  onClick={() => void copyRecoveryCodes()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-fg-strong"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {recoveryCodes.map((code) => (
                  <code
                    key={code}
                    className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold tracking-[0.12em] text-fg-strong"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <article
          data-tour="settings-sessions-card"
          className="rounded-[28px] border border-card-border bg-card p-5 shadow-theme-card sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-fg-strong">Sesiones activas</h3>
              <p className="mt-1 text-sm text-fg-secondary">
                Revisa dispositivos conectados y cierra accesos que no reconozcas.
              </p>
            </div>
            <Button
              onClick={() => void revokeOtherSessions()}
              disabled={isWorking || sessions.length <= 1}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-fg-strong transition hover:border-accent disabled:opacity-50"
            >
              Cerrar otras
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {sessions.map((session) => {
              const device = summarizeDevice(session.user_agent);
              const Icon = device.icon;
              return (
                <div
                  key={session.id}
                  className="rounded-2xl border border-border-soft bg-surface-soft p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-card-border bg-surface p-2 text-fg-secondary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-fg-strong">
                          {device.label} · {browserName(session.user_agent)}
                        </p>
                        {session.current ? (
                          <span className="rounded-full bg-surface-success px-2.5 py-1 text-xs font-semibold text-success">
                            Actual
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-fg-secondary">
                        Último uso: {formatDateTime(session.last_used_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        IP: {session.ip ?? 'No disponible'} · Expira:{' '}
                        {formatDateTime(session.expires_at)}
                      </p>
                    </div>
                    {!session.current ? (
                      <Button
                        onClick={() => void revokeSession(session.id)}
                        disabled={isWorking}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-fg-strong transition hover:border-danger hover:text-danger disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Cerrar
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {!sessions.length && !isLoading ? (
              <div className="rounded-2xl border border-border-soft bg-surface-soft p-4 text-sm text-fg-secondary">
                No hay sesiones activas para mostrar.
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
