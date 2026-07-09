# Arquitectura general

## Objetivo del producto

Bukky Booking es una plataforma SaaS multiempresa para negocios que gestionan citas, servicios, profesionales y disponibilidad. El sistema separa operación interna, reservas públicas y administración global.

## Componentes principales

```text
booking-system-backend/
  NestJS
  TypeORM
  PostgreSQL
  S3
  Resend
  Turnstile
  Sentry

booking-system-frontend/
  Next.js App Router
  React
  TypeScript
  Tailwind CSS
  Radix UI
  Sentry

performance/
  k6
  Playwright
  Lighthouse
  EXPLAIN ANALYZE
```

## Backend

El backend expone la API bajo prefijo global `/api`.

Responsabilidades:

- Autenticación y sesiones.
- MFA.
- Autorización por rol y negocio.
- Gestión de negocios.
- Gestión de servicios y profesionales.
- Horarios, descansos y ausencias.
- Disponibilidad.
- Creación, cancelación, completado y reprogramación de citas.
- Emails transaccionales.
- Auditoría.
- Reportes.
- Assets públicos en S3.
- Swagger en desarrollo.
- Captura de errores con Sentry.
- Logs de latencia por request.

Tecnologías:

- NestJS 11.
- TypeORM 0.3.
- PostgreSQL.
- Argon2 para contraseñas.
- JWT para access token.
- Refresh token en cookie HttpOnly.
- Cloudflare Turnstile opcional.
- Resend para emails.
- AWS S3 para assets.

## Frontend

Responsabilidades:

- Login y sesión administrativa.
- Panel de superadministrador.
- Panel de administrador de negocio.
- Configuración general, theme builder y seguridad.
- Servicios, profesionales y citas.
- Citas en tabla y calendario.
- Flujo público de reserva.
- Flujo público de gestión/reprogramación por token.
- Feedback de errores entendible para usuarios finales.

Tecnologías:

- Next.js 16 App Router.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- Radix UI.
- Recharts.
- `qrcode` para QR del enlace público.
- Cliente HTTP centralizado con refresh, CSRF y traducción de errores.

## Límites de confianza

```text
Cliente público
  -> endpoints públicos de negocio, disponibilidad, reserva y gestión por token

Administrador autenticado
  -> API protegida por access token, refresh cookie, CSRF, rol y negocio

Backend
  -> PostgreSQL, S3, Resend, Turnstile, Sentry

Frontend
  -> experiencia, validaciones útiles y representación visual
```

El frontend nunca decide precio final, disponibilidad final, capacidad ni autorización. Esas decisiones pertenecen al backend.

## Roles

### Superadministrador

Puede:

- Consultar dashboard global.
- Consultar reportes globales.
- Administrar negocios.
- Administrar administradores de negocio.
- Consultar auditoría global.
- Configurar identidad visual de plataforma o negocios.

No debe operar citas internas de un negocio como si fuera administrador de negocio.

### Administrador de negocio

Puede operar únicamente dentro de su negocio:

- Dashboard del negocio.
- Servicios.
- Profesionales.
- Horarios, descansos y ausencias.
- Citas públicas y manuales.
- Reprogramación de citas.
- Cambios de estado.
- Reportes.
- Logs.
- Configuración general.
- Theme builder.
- Seguridad de cuenta: MFA y sesiones.

### Profesional

Actualmente recibe emails operativos de citas asignadas. Todavía no existe panel independiente de profesional.

### Cliente final

Puede:

- Abrir el enlace público del negocio.
- Seleccionar servicio, profesional, fecha y hora.
- Confirmar una reserva.
- Reprogramar desde enlace seguro.

No puede acceder a datos internos ni forzar reglas de disponibilidad.

## Observabilidad

Backend:

- Sentry para errores.
- Interceptor global de performance.
- Logs de requests lentos sin body, cookies, tokens ni datos sensibles.

Frontend:

- Sentry para errores de cliente y Next.js.
- Tunnel `/monitoring`.
- Sanitización de datos sensibles.

Performance:

- k6 para API.
- Playwright para flujos reales.
- Lighthouse para rutas frontend.
- `EXPLAIN ANALYZE` para queries críticas.
