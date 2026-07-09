'use client';

import { authService } from '@/modules/auth/services/auth.service';
import Button from '@/modules/ui/Button';
import Input from '@/modules/ui/Input';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await authService.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      setSent(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo procesar la solicitud ahora mismo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-app px-4 py-6">
      <div className="w-full max-w-md rounded-[28px] border border-border bg-surface p-6 shadow-theme-soft sm:p-8">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-fg-secondary transition-colors hover:text-fg-strong"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al login
        </button>

        <h1 className="text-2xl font-semibold text-fg-strong">Recuperar acceso</h1>
        <p className="mt-2 text-sm text-fg-secondary">
          Ingresa tu correo y te enviaremos un enlace seguro para restablecer tu contraseña o
          activar tu acceso si aún no has terminado el onboarding.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <Input
            type="email"
            id="recovery-email"
            name="recovery-email"
            label="Correo electrónico"
            placeholder="alguien@ejemplo.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 border-border bg-surface-soft text-fg"
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl bg-accent text-accent-text transition-all hover:bg-accent-hover"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
          </Button>
        </form>

        {errorMessage ? (
          <div className="mt-5 rounded-xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-danger">
            {errorMessage}
          </div>
        ) : null}

        {sent && (
          <div className="mt-5 rounded-xl border border-border-success bg-surface-success px-4 py-3 text-sm text-success">
            <div className="flex items-start gap-2">
              <MailCheck className="mt-0.5 h-4 w-4" />
              <p>
                Si el correo existe, te enviamos un enlace seguro a esa bandeja para continuar con
                tu acceso.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
