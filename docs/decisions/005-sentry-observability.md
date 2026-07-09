# ADR 005 - Observabilidad de errores con Sentry

## Estado

Aceptada.

## Contexto

La aplicación necesita visibilidad real de errores en frontend y backend. Los logs locales no son suficientes para producción.

## Decisión

Integrar Sentry en ambos proyectos:

- Backend: `@sentry/nestjs`.
- Frontend: `@sentry/nextjs`.

Modelo recomendado:

- Proyecto Sentry separado para backend.
- Proyecto Sentry separado para frontend.

## Sanitización

No se debe enviar PII ni secretos.

Filtrar:

- Cookies.
- Authorization headers.
- CSRF.
- Captcha.
- Passwords.
- Tokens.
- Emails.
- Teléfonos.
- Notas de cliente.
- Body y query sensibles.

## Frontend

El frontend usa tunnel:

```text
/monitoring
```

Esto reduce bloqueos por ad blockers y evita abrir CSP directamente hacia dominios externos de Sentry.

## Consecuencias

Ventajas:

- Stack traces reales.
- Releases separadas.
- Alertas por proyecto.
- Mejor diagnóstico de errores de usuario.

Costes:

- Requiere variables por entorno.
- Requiere controlar volumen de eventos.
- Requiere revisión periódica de sanitización.
