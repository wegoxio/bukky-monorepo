'use client';

import { useEffect } from 'react';
import { isSentryEnabled } from '@/sentry.shared';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (!isSentryEnabled()) return;

    void import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
            background: '#f4f1f8',
            color: '#111827',
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          <section
            style={{
              width: 'min(520px, 100%)',
              border: '1px solid rgba(17, 24, 39, 0.12)',
              borderRadius: '28px',
              padding: '32px',
              background: 'white',
              boxShadow: '0 24px 70px rgba(17, 24, 39, 0.12)',
            }}
          >
            <p
              style={{
                margin: '0 0 12px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#8b5cf6',
              }}
            >
              Error inesperado
            </p>
            <h1 style={{ margin: '0 0 12px', fontSize: '28px' }}>No pudimos cargar esta vista</h1>
            <p style={{ margin: 0, lineHeight: 1.6, color: '#4b5563' }}>
              Ya registramos el problema para revisarlo. Puedes recargar la página o volver a
              intentarlo en unos minutos.
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
