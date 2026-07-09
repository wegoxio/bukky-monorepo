# Documentación interna - Bukky Booking

Esta carpeta es la fuente ordenada de documentación técnica del proyecto. El brief técnico histórico queda como referencia, pero la documentación viva debe mantenerse aquí.

## Estructura

```text
docs/
  architecture/
    overview.md
    domain-and-flows.md
    security-and-operations.md
    roadmap-and-limitations.md
  decisions/
    001-auth-session-mfa.md
    002-booking-integrity-and-availability.md
    003-public-assets-s3.md
    004-swagger-development-only.md
    005-sentry-observability.md
    006-performance-baseline-and-rate-limit.md
    007-admin-ux-and-calendar.md
    008-monorepo-quality-gates.md
  api/
    endpoints.md
  setup/
    local-development.md
    aws-s3-public-assets.md
  performance/
    README.md
    baselines/
```

## Regla de mantenimiento

- Cambios de arquitectura: actualizar `docs/architecture`.
- Decisiones técnicas importantes: crear o actualizar un ADR en `docs/decisions`.
- Cambios de API: actualizar `docs/api/endpoints.md`.
- Cambios de entorno, instalación o comandos: actualizar `docs/setup/local-development.md`.
- Mediciones de performance: documentar en `docs/performance`.

## Estado funcional resumido

Bukky Booking es una plataforma SaaS multiempresa para negocios de servicios. Actualmente cubre:

- Autenticación administrativa con JWT, refresh HttpOnly, CSRF, MFA y sesiones.
- Superadministradores y administradores de negocio.
- Servicios, profesionales, horarios, descansos y ausencias.
- Reservas públicas guiadas.
- Reservas manuales desde panel.
- Reprogramación por enlace seguro para cliente.
- Reprogramación operativa desde panel.
- Citas en tabla y calendario.
- Emails separados para cliente y profesional.
- Assets públicos en S3.
- Auditoría, reportes y dashboards.
- Swagger solo en desarrollo.
- Sentry en backend y frontend.
- Herramientas de performance con k6, Playwright, Lighthouse y `EXPLAIN ANALYZE`.

Limitaciones actuales principales:

- No hay pagos online.
- No hay WhatsApp/SMS nativo.
- No hay panel independiente para profesionales.
- No hay sincronización bidireccional con Google Calendar, Outlook o Apple Calendar.
