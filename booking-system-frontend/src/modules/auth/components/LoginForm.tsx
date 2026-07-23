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
import { AnimatePresence, MotionConfig, motion, type Variants } from 'framer-motion';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type HighlightItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type LoginFieldErrors = Partial<{
  email: string;
  password: string;
  mfaCode: string;
}>;

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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_EASE = [0.22, 1, 0.36, 1] as const;

const authShellVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 34,
    scale: 0.94,
    filter: 'blur(16px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 145,
      damping: 20,
      mass: 0.85,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const authItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.97,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 230,
      damping: 24,
      mass: 0.7,
    },
  },
};

const authCardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.96,
    rotateX: 7,
    filter: 'blur(14px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 170,
      damping: 20,
      mass: 0.8,
      delay: 0.06,
    },
  },
};

const authStepVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 32,
    y: 10,
    scale: 0.985,
    filter: 'blur(12px)',
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 25,
      mass: 0.72,
      staggerChildren: 0.045,
      delayChildren: 0.04,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -26,
    y: -8,
    scale: 0.985,
    filter: 'blur(10px)',
    transition: {
      duration: 0.2,
      ease: AUTH_EASE,
    },
  }),
};

const authStepItemVariants: Variants = {
  enter: {
    opacity: 0,
    y: 12,
    filter: 'blur(8px)',
  },
  center: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 26,
      mass: 0.6,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    filter: 'blur(6px)',
    transition: {
      duration: 0.16,
      ease: AUTH_EASE,
    },
  },
};

const authButtonLabelVariants: Variants = {
  enter: {
    opacity: 0,
    y: 8,
    filter: 'blur(6px)',
  },
  center: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.22,
      ease: AUTH_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(6px)',
    transition: {
      duration: 0.14,
      ease: AUTH_EASE,
    },
  },
};

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
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [mfaChallenge, setMfaChallenge] = useState<AuthMfaChallengeResponse | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [stepDirection, setStepDirection] = useState(1);

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

  const submitLabel = isLoading
    ? 'Verificando...'
    : mfaChallenge
      ? 'Verificar y entrar'
      : 'Entrar al panel';

  useEffect(() => {
    const presetEmail = searchParams.get('email')?.trim() ?? '';
    if (presetEmail) {
      setEmail(presetEmail);
    }
  }, [searchParams]);

  const clearFieldError = (field: keyof LoginFieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearFeedback = (field: keyof LoginFieldErrors) => {
    clearFieldError(field);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const validateCredentials = (): LoginFieldErrors => {
    const errors: LoginFieldErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      errors.email = 'Ingresa tu correo electr\u00f3nico.';
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      errors.email = 'Ingresa un correo electr\u00f3nico v\u00e1lido.';
    }

    if (!password.trim()) {
      errors.password = 'Ingresa tu contrase\u00f1a.';
    }

    return errors;
  };

  const validateMfa = (): LoginFieldErrors => {
    const errors: LoginFieldErrors = {};
    const normalizedCode = mfaCode.trim();

    if (!normalizedCode) {
      errors.mfaCode = useRecoveryCode
        ? 'Ingresa tu c\u00f3digo de recuperaci\u00f3n.'
        : 'Ingresa el c\u00f3digo de 6 d\u00edgitos.';
    } else if (!useRecoveryCode && !/^\d{6}$/.test(normalizedCode)) {
      errors.mfaCode = 'El c\u00f3digo debe tener 6 d\u00edgitos.';
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (mfaChallenge) {
      const nextFieldErrors = validateMfa();
      setFieldErrors(nextFieldErrors);

      if (Object.keys(nextFieldErrors).length > 0) {
        return;
      }

      try {
        await completeMfaLogin({
          challenge_token: mfaChallenge.challenge_token,
          ...(useRecoveryCode ? { recovery_code: mfaCode.trim() } : { code: mfaCode.trim() }),
        });
        router.push('/dashboard');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo verificar el código.';
        setErrorMessage(message);
      }
      return;
    }

    const nextFieldErrors = validateCredentials();
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    if (isTurnstileEnabled && !captchaToken) {
      setErrorMessage('Completa la verificación de seguridad para continuar.');
      return;
    }

    try {
      const challenge = await login({
        email: email.trim(),
        password,
        captcha_token: isTurnstileEnabled ? (captchaToken ?? undefined) : undefined,
      });
      if (challenge) {
        setFieldErrors({});
        setStepDirection(1);
        setMfaChallenge(challenge);
        setMfaCode('');
        setUseRecoveryCode(false);
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
    <MotionConfig reducedMotion="user">
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
                <Image
                  width={278}
                  height={302}
                  src="/bukky-logo.svg"
                  alt="Bukky logo"
                  className="h-auto w-[25px]"
                />
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
            <motion.div
              variants={authShellVariants}
              initial="hidden"
              animate="visible"
              className="w-full max-w-md lg:max-w-110"
            >
              <motion.div
                variants={authItemVariants}
                className="mb-7 flex justify-center lg:hidden"
              >
                <Image
                  width={1507}
                  height={302}
                  src="/bukky-logo-black.svg"
                  alt="Bukky completo"
                  className="h-auto w-[200px]"
                />
              </motion.div>

              <motion.div
                variants={authItemVariants}
                className="mb-6 hidden justify-center lg:flex"
              >
                <Image
                  width={1507}
                  height={302}
                  src="/bukky-logo-black.svg"
                  alt="Bukky completo"
                  className="h-auto w-[200px]"
                />
              </motion.div>

              <motion.div
                layout
                variants={authCardVariants}
                className="relative overflow-hidden rounded-[30px] border border-border-strong bg-surface p-6 shadow-theme-soft sm:p-8"
                style={{ transformPerspective: 1000 }}
              >
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent/55 to-transparent"
                  initial={{ opacity: 0, x: '-130%' }}
                  animate={{ opacity: [0, 1, 0], x: '130%' }}
                  transition={{ delay: 0.28, duration: 1.05, ease: AUTH_EASE }}
                />
                <AnimatePresence mode="wait" initial={false} custom={stepDirection}>
                  <motion.div
                    key={mfaChallenge ? 'mfa-heading' : 'login-heading'}
                    custom={stepDirection}
                    variants={authStepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="mb-6"
                  >
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
                  </motion.div>
                </AnimatePresence>

                <motion.form
                  layout
                  noValidate
                  className="space-y-4 sm:space-y-5"
                  onSubmit={handleSubmit}
                >
                  <AnimatePresence mode="wait" initial={false} custom={stepDirection}>
                    {!mfaChallenge ? (
                      <motion.div
                        key="credentials"
                        custom={stepDirection}
                        variants={authStepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="space-y-4 sm:space-y-5"
                      >
                        <motion.div variants={authStepItemVariants}>
                          <Input
                            type="email"
                            id="email"
                            name="email"
                            label="Correo electrónico"
                            placeholder="alguien@ejemplo.com"
                            autoComplete="email"
                            required
                            value={email}
                            errorMessage={fieldErrors.email}
                            onChange={(event) => {
                              setEmail(event.target.value);
                              clearFeedback('email');
                            }}
                            className={`h-12 text-fg focus:outline-none focus:ring-2 ${
                              fieldErrors.email
                                ? 'border-danger bg-surface-danger-soft focus:border-danger focus:ring-danger/20'
                                : 'border-border bg-surface-soft focus:border-accent focus:ring-accent/25'
                            }`}
                          />
                        </motion.div>

                        <motion.div variants={authStepItemVariants}>
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
                              onChange={(event) => {
                                setPassword(event.target.value);
                                clearFeedback('password');
                              }}
                              placeholder="********"
                              autoComplete="current-password"
                              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                              aria-invalid={fieldErrors.password ? true : undefined}
                              className={`h-12 w-full rounded-lg border px-3 pr-11 text-fg focus:outline-none focus:ring-2 ${
                                fieldErrors.password
                                  ? 'border-danger bg-surface-danger-soft focus:border-danger focus:ring-danger/20'
                                  : 'border-border bg-surface-soft focus:border-accent focus:ring-accent/25'
                              }`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-fg-secondary transition-colors hover:text-accent"
                              aria-label={
                                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <AnimatePresence initial={false}>
                            {fieldErrors.password ? (
                              <motion.p
                                key="password-error"
                                id="password-error"
                                initial={{ opacity: 0, y: -4, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -3, height: 0 }}
                                transition={{ duration: 0.18, ease: AUTH_EASE }}
                                className="mt-2 overflow-hidden text-xs text-danger"
                              >
                                {fieldErrors.password}
                              </motion.p>
                            ) : null}
                          </AnimatePresence>
                        </motion.div>

                        <motion.div
                          variants={authStepItemVariants}
                          className="flex flex-col items-start gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
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
                        </motion.div>

                        {isTurnstileEnabled ? (
                          <motion.div
                            variants={authStepItemVariants}
                            className="overflow-hidden rounded-xl border border-border-strong bg-surface-soft p-2.5 sm:p-3"
                          >
                            <TurnstileWidget
                              siteKey={TURNSTILE_SITE_KEY}
                              action={TURNSTILE_LOGIN_ACTION}
                              refreshKey={captchaRefreshKey}
                              onTokenChange={setCaptchaToken}
                              className="w-full overflow-hidden"
                            />
                          </motion.div>
                        ) : null}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="mfa"
                        custom={stepDirection}
                        variants={authStepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="space-y-4"
                      >
                        <motion.div
                          variants={authStepItemVariants}
                          className="rounded-2xl border border-border-success bg-surface-success px-4 py-3 text-sm text-success"
                        >
                          Tu contraseña fue validada. Falta confirmar el segundo factor para abrir
                          la sesión.
                        </motion.div>
                        <motion.div variants={authStepItemVariants}>
                          <Input
                            id="mfaCode"
                            name="mfaCode"
                            label={
                              useRecoveryCode ? 'Código de recuperación' : 'Código de 6 dígitos'
                            }
                            placeholder={useRecoveryCode ? 'ABCD-EFGH-IJKL' : '123456'}
                            inputMode={useRecoveryCode ? 'text' : 'numeric'}
                            autoComplete="one-time-code"
                            required
                            value={mfaCode}
                            errorMessage={fieldErrors.mfaCode}
                            onChange={(event) => {
                              setMfaCode(event.target.value);
                              clearFeedback('mfaCode');
                            }}
                            className={`h-12 text-fg tracking-[0.18em] focus:outline-none focus:ring-2 ${
                              fieldErrors.mfaCode
                                ? 'border-danger bg-surface-danger-soft focus:border-danger focus:ring-danger/20'
                                : 'border-border bg-surface-soft focus:border-accent focus:ring-accent/25'
                            }`}
                          />
                        </motion.div>
                        <motion.button
                          variants={authStepItemVariants}
                          type="button"
                          onClick={() => {
                            setUseRecoveryCode((current) => !current);
                            setMfaCode('');
                            clearFeedback('mfaCode');
                          }}
                          className="text-sm font-medium text-fg-strong transition-colors hover:text-accent"
                        >
                          {useRecoveryCode
                            ? 'Usar código de la app autenticadora'
                            : 'Usar código de recuperación'}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent to-accent-hover text-accent-text shadow-theme-accent transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex min-h-5 items-center overflow-hidden">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={submitLabel}
                          variants={authButtonLabelVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                        >
                          {submitLabel}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  {mfaChallenge ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStepDirection(-1);
                        setMfaChallenge(null);
                        setMfaCode('');
                        setUseRecoveryCode(false);
                        setFieldErrors({});
                        setErrorMessage('');
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-fg-secondary transition-colors hover:text-fg-strong"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver a credenciales
                    </button>
                  ) : null}

                  <AnimatePresence initial={false}>
                    {errorMessage ? (
                      <motion.p
                        key={errorMessage}
                        role="alert"
                        initial={{ opacity: 0, y: 8, scale: 0.98, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -6, scale: 0.98, filter: 'blur(6px)' }}
                        transition={{ duration: 0.2, ease: AUTH_EASE }}
                        className="rounded-lg bg-surface-danger px-3 py-2 text-sm text-danger"
                      >
                        {errorMessage}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </motion.form>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
