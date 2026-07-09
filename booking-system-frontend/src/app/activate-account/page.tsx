'use client';

import PasswordRequirements from '@/modules/auth/components/PasswordRequirements';
import { authService } from '@/modules/auth/services/auth.service';
import Button from '@/modules/ui/Button';
import Input from '@/modules/ui/Input';
import { isStrongPassword } from '@/utils/validation';
import { ArrowLeft, Eye, EyeOff, MailCheck, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';

function ActivateAccountFallback() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-app px-4 py-6">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-surface p-6 shadow-theme-soft sm:p-8">
        <h1 className="text-2xl font-semibold text-fg-strong">Activar acceso</h1>
        <div className="mt-6 rounded-2xl border border-border bg-surface-soft px-4 py-5 text-sm text-fg-secondary">
          Preparando el enlace seguro...
        </div>
      </div>
    </section>
  );
}

function ActivateAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didResolveRef = useRef(false);

  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [isResolving, setIsResolving] = useState(true);
  const [resolveError, setResolveError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (didResolveRef.current) return;

    const rawToken = searchParams.get('token')?.trim() ?? '';
    if (!rawToken) {
      setResolveError('El enlace no es válido o ya no está disponible.');
      setIsResolving(false);
      didResolveRef.current = true;
      return;
    }

    didResolveRef.current = true;
    setToken(rawToken);

    void authService
      .resolveTenantAdminOnboarding({ token: rawToken })
      .then((response) => {
        setEmail(response.email);
        setTenantName(response.tenant.name);
        setName(response.name);

        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/activate-account');
        }
      })
      .catch((error) => {
        setResolveError(error instanceof Error ? error.message : 'No se pudo validar este enlace.');
      })
      .finally(() => {
        setIsResolving(false);
      });
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    const normalizedName = name.trim();
    if (!normalizedName) {
      setSubmitError('Debes confirmar tu nombre.');
      return;
    }

    if (!isStrongPassword(password)) {
      setSubmitError('La contraseña no cumple los requisitos de seguridad.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Las contrasenas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.completeTenantAdminOnboarding({
        token,
        name: normalizedName,
        password,
      });

      router.push(`/?notice=access-ready&email=${encodeURIComponent(response.email)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo completar el acceso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-app px-4 py-6">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-surface p-6 shadow-theme-soft sm:p-8">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-fg-secondary transition-colors hover:text-fg-strong"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al login
        </button>

        <h1 className="text-2xl font-semibold text-fg-strong">Activar acceso</h1>
        <p className="mt-2 text-sm text-fg-secondary">
          Verificaremos tu correo y luego definiras la contraseña para entrar al panel.
        </p>

        {isResolving ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface-soft px-4 py-5 text-sm text-fg-secondary">
            Validando enlace seguro...
          </div>
        ) : resolveError ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border-danger bg-surface-danger px-4 py-4 text-sm text-danger">
              {resolveError}
            </div>
            <Button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="h-11 w-full rounded-xl bg-accent text-accent-text hover:bg-accent-hover"
            >
              Solicitar un nuevo enlace
            </Button>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-border-success bg-surface-success px-4 py-4 text-sm text-success">
              <div className="flex items-start gap-3">
                <MailCheck className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-medium">Correo verificado</p>
                  <p className="mt-1 text-sm text-success">
                    Completa tu acceso para administrar {tenantName || 'tu negocio'}.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-surface-soft p-4 text-sm text-fg-secondary">
              <div className="flex items-center gap-2 font-medium text-fg-strong">
                <ShieldCheck className="h-4 w-4 text-fg-icon" />
                Resumen de acceso
              </div>
              <p>
                <span className="font-medium text-fg-strong">Correo:</span> {email}
              </p>
              <p>
                <span className="font-medium text-fg-strong">Negocio:</span> {tenantName}
              </p>
            </div>

            <Input
              label="Nombre"
              id="activate-account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre"
              maxLength={120}
              required
              className="h-12 border-border bg-surface-soft text-fg"
            />

            <div>
              <label
                htmlFor="activate-account-password"
                className="mb-2 block text-sm font-medium text-fg-strong"
              >
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="activate-account-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Contraseña"
                  required
                  className="h-12 w-full rounded-lg border border-border bg-surface-soft px-3 pr-11 text-fg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-fg-secondary transition-colors hover:text-fg-strong"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <PasswordRequirements password={password} />

            <div>
              <label
                htmlFor="activate-account-confirm-password"
                className="mb-2 block text-sm font-medium text-fg-strong"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  id="activate-account-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="********"
                  required
                  className="h-12 w-full rounded-lg border border-border bg-surface-soft px-3 pr-11 text-fg"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-fg-secondary transition-colors hover:text-fg-strong"
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {submitError ? (
              <div className="rounded-2xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-danger">
                {submitError}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl bg-accent text-accent-text hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando...' : 'Completar acceso'}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={<ActivateAccountFallback />}>
      <ActivateAccountContent />
    </Suspense>
  );
}
