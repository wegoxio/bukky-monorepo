'use client';

import { useAuth } from '@/context/AuthContext';
import Button from '@/modules/ui/Button';
import Input from '@/modules/ui/Input';
import TurnstileWidget from '@/modules/ui/TurnstileWidget';
import { AuthMfaChallengeResponse } from '@/types/auth.types';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Eye,
  EyeOff,
  ShieldCheck,
  Users2,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { SubmitEvent, useEffect, useMemo, useState } from 'react';

type HighlightItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const LOGIN_HIGHLIGHTS: HighlightItem[] = [
  {
    title: 'Agenda por profesional',
    description: 'Controla horarios reales por servicio, descansos y citas ya tomadas.',
    icon: CalendarClock,
  },
  {
    title: 'Vista por negocio',
    description: 'Cada negocio mantiene sus datos y operaciones aisladas.',
    icon: Users2,
  },
  {
    title: 'Trazabilidad completa',
    description: 'Auditoría de cambios críticos para equipo y plataforma.',
    icon: ShieldCheck,
  },
];

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
const TURNSTILE_LOGIN_ACTION = process.env.NEXT_PUBLIC_TURNSTILE_LOGIN_ACTION?.trim() || 'login';

export default function LoginForm() {
  const { login, completeMfaLogin, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTurnstileEnabled = TURNSTILE_SITE_KEY.length > 0;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState<AuthMfaChallengeResponse | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const noticeMessage = useMemo(() => {
    const notice = searchParams.get('notice');
    if (notice === 'access-ready') {
      return 'Tu acceso quedó configurado. Ya puedes iniciar sesión.';
    }

    if (notice === 'password-reset') {
      return 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.';
    }

    return '';
  }, [searchParams]);

  useEffect(() => {
    const presetEmail = searchParams.get('email')?.trim() ?? '';
    if (presetEmail) {
      setEmail(presetEmail);
    }
  }, [searchParams]);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setErrorMessage('');

    if (mfaChallenge) {
      try {
        await completeMfaLogin({
          challenge_token: mfaChallenge.challenge_token,
          ...(useRecoveryCode ? { recovery_code: mfaCode } : { code: mfaCode }),
        });
        router.push('/dashboard');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo verificar el código.';
        setErrorMessage(message);
      }
      return;
    }

    if (isTurnstileEnabled && !captchaToken) {
      setErrorMessage('Completa la verificación de seguridad para continuar.');
      return;
    }

    try {
      const challenge = await login({
        email,
        password,
        captcha_token: isTurnstileEnabled ? (captchaToken ?? undefined) : undefined,
      });
      if (challenge) {
        setMfaChallenge(challenge);
        setMfaCode('');
        return;
      }
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
      setErrorMessage(message);
      if (isTurnstileEnabled) {
        setCaptchaRefreshKey((prev) => prev + 1);
      }
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-linear-to-br from-shell via-app to-shell px-4 py-4 sm:px-5 sm:py-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-accent/16 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-fg-strong/14 blur-3xl" />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-300 flex-col overflow-hidden rounded-[30px] border border-border-strong bg-surface/95 shadow-[0_30px_88px_rgba(30,30,30,0.25)] backdrop-blur-sm sm:min-h-[calc(100vh-3rem)] sm:rounded-[34px] lg:flex-row">
        <aside className="relative hidden w-[44%] overflow-hidden bg-[linear-gradient(155deg,var(--sidebar-bg-start)_0%,#262626_60%,#2b2144_100%)] p-8 text-inverse lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 opacity-35">
            <div className="absolute -left-12 top-10 h-44 w-44 rounded-full bg-inverse-20 blur-3xl" />
            <div className="absolute -right-14 bottom-24 h-56 w-56 rounded-full bg-accent/45 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="mb-12 inline-flex items-center gap-3 rounded-2xl border border-inverse-20 bg-inverse-10 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <Image width={25} height={25} src="/bukky-logo.svg" alt="Bukky logo" />
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-inverse-80">
                Plataforma de Reservas
              </p>
            </div>

            <h2 className="max-w-sm text-3xl font-semibold leading-tight">
              Gestiona tu operación diaria desde un solo panel.
            </h2>
            <p className="mt-4 max-w-md text-sm text-inverse-75">
              Reserva citas, controla horarios del equipo y monitorea resultados en tiempo real.
            </p>

            <div className="mt-8 space-y-3">
              {LOGIN_HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-inverse-15 bg-[linear-gradient(155deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-inverse-20 text-inverse-95">
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="font-semibold">{item.title}</p>
                    </div>
                    <p className="mt-2 text-sm text-inverse-80">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="flex flex-1 items-start justify-center bg-linear-to-b from-surface via-surface-subtle to-surface-soft px-6 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-12 lg:items-center lg:p-10">
          <div className="w-full max-w-md lg:max-w-110">
            <div className="mb-7 flex justify-center lg:hidden">
              <Image width={200} height={30} src="/login-logo.svg" alt="Bukky completo" />
            </div>

            <div className="mb-6 hidden justify-center lg:flex">
              <Image width={200} height={20} src="/login-logo.svg" alt="Bukky completo" />
            </div>

            <div className="rounded-[30px] border border-border-strong bg-surface p-6 shadow-theme-soft sm:p-8">
              <div className="mb-6">
                <h1 className="mt-4 text-2xl font-semibold text-fg-strong">
                  {mfaChallenge ? 'Verifica tu identidad' : 'Iniciar sesión'}
                </h1>
                <p className="mt-2 text-sm text-fg-secondary">
                  {mfaChallenge
                    ? `Ingresa el código de tu app autenticadora para ${mfaChallenge.user.email}.`
                    : 'Accede a tu panel para administrar citas, equipo y configuraciones.'}
                </p>
                {noticeMessage && !mfaChallenge ? (
                  <div className="mt-4 rounded-2xl border border-border-success bg-surface-success px-4 py-3 text-sm text-success">
                    {noticeMessage}
                  </div>
                ) : null}
              </div>

              <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
                {!mfaChallenge ? (
                  <>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      label="Correo electrónico"
                      placeholder="alguien@ejemplo.com"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 border-border bg-surface-soft text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                    />

                    <div>
                      <label
                        htmlFor="password"
                        className="mb-2 block text-sm font-medium text-fg-strong"
                      >
                        Contraseña
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="********"
                          className="h-12 w-full rounded-lg border border-border bg-surface-soft px-3 pr-11 text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-fg-secondary transition-colors hover:text-accent"
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <label className="inline-flex items-center gap-2 text-fg-secondary">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border text-accent"
                        />
                        Recordar este equipo
                      </label>
                      <button
                        type="button"
                        onClick={() => router.push('/forgot-password')}
                        className="font-medium text-fg-strong transition-colors hover:text-accent"
                      >
                        Olvidé mi contraseña
                      </button>
                    </div>

                    {isTurnstileEnabled ? (
                      <div className="overflow-hidden rounded-xl border border-border-strong bg-surface-soft p-2.5 sm:p-3">
                        <TurnstileWidget
                          siteKey={TURNSTILE_SITE_KEY}
                          action={TURNSTILE_LOGIN_ACTION}
                          refreshKey={captchaRefreshKey}
                          onTokenChange={setCaptchaToken}
                          className="w-full overflow-hidden"
                        />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border-success bg-surface-success px-4 py-3 text-sm text-success">
                      Tu contraseña fue validada. Falta confirmar el segundo factor para abrir la
                      sesión.
                    </div>
                    <Input
                      id="mfaCode"
                      name="mfaCode"
                      label={useRecoveryCode ? 'Código de recuperación' : 'Código de 6 dígitos'}
                      placeholder={useRecoveryCode ? 'ABCD-EFGH-IJKL' : '123456'}
                      inputMode={useRecoveryCode ? 'text' : 'numeric'}
                      autoComplete="one-time-code"
                      required
                      value={mfaCode}
                      onChange={(event) => setMfaCode(event.target.value)}
                      className="h-12 border-border bg-surface-soft text-fg tracking-[0.18em] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUseRecoveryCode((current) => !current);
                        setMfaCode('');
                      }}
                      className="text-sm font-medium text-fg-strong transition-colors hover:text-accent"
                    >
                      {useRecoveryCode
                        ? 'Usar código de la app autenticadora'
                        : 'Usar código de recuperación'}
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent to-accent-hover text-accent-text shadow-theme-accent transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading
                    ? 'Verificando...'
                    : mfaChallenge
                      ? 'Verificar y entrar'
                      : 'Entrar al panel'}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                {mfaChallenge ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMfaChallenge(null);
                      setMfaCode('');
                      setUseRecoveryCode(false);
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-fg-secondary transition-colors hover:text-fg-strong"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a credenciales
                  </button>
                ) : null}

                {errorMessage && (
                  <p className="rounded-lg bg-surface-danger px-3 py-2 text-sm text-danger">
                    {errorMessage}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
