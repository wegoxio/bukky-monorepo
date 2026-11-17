# Bukky Booking: estructura técnica y funcionamiento

Este documento describe el sistema que existe en el repositorio. La fuente de verdad ejecutable sigue siendo el código y las migraciones.

## Visión general

Bukky es un SaaS multiempresa para negocios de servicios. Cada tenant administra profesionales, servicios, horarios y reservas; los clientes finales reservan y reprograman desde flujos públicos.

```text
Navegador
   │
   ├── Next.js 16 / React 19
   │       │ REST + cookies + CSRF
   │       ▼
   └── NestJS 11
           ├── PostgreSQL / TypeORM
           ├── S3: logos, favicon y avatares
           ├── Resend: email transaccional
           ├── Turnstile: protección anti-bot
```

El monorepo usa pnpm workspaces:

- `booking-system-frontend`: aplicación Next.js.
- `booking-system-backend`: API, reglas de negocio, worker y migraciones.
- `ops/aws-lightsail`: infraestructura operativa de producción.
- `performance`: pruebas de carga y flujos críticos.
- `.github/workflows`: validación y entrega continua.

## Frontend

El frontend usa App Router y genera un artefacto `standalone` para Docker. La mayor parte de las pantallas de negocio son componentes cliente que consumen la API REST.

Rutas principales:

| Ruta                                                       | Función                               |
| ---------------------------------------------------------- | ------------------------------------- |
| `/`                                                        | Inicio de sesión                      |
| `/activate-account`, `/forgot-password`, `/reset-password` | Acceso y recuperación                 |
| `/book/[tenantSlug]`                                       | Reserva pública                       |
| `/bookings/manage/[token]`                                 | Consulta y reprogramación pública     |
| `/dashboard`                                               | Resumen de operación                  |
| `/bookings`                                                | Gestión y calendario de reservas      |
| `/services`, `/employees`                                  | Catálogo y profesionales              |
| `/reports`, `/audit-logs`                                  | Reportes y auditoría                  |
| `/settings`, `/profile`                                    | Negocio, branding, seguridad y perfil |
| `/tenants`, `/users`                                       | Superadministración                   |

Los módulos de interfaz están en `booking-system-frontend/src/modules`. `AuthContext` mantiene el access token en memoria y recupera la sesión mediante la cookie HttpOnly de refresh. El cliente HTTP añade el token y el header CSRF cuando corresponde.

Las variables `NEXT_PUBLIC_*` se incorporan durante la construcción de la imagen; cambiar la URL pública o Turnstile exige reconstruir el frontend.

## Backend y módulos

La API usa el prefijo `/api`. Swagger existe solamente en desarrollo en `/api/docs`.

| Módulo            | Responsabilidad                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `auth`            | Login, refresh, logout, bloqueo por intentos, MFA TOTP, sesiones, activación, recuperación y onboarding |
| `tenant`          | Negocios/tenants, perfil propio y administración global                                                 |
| `users`           | Administradores de tenant e invitaciones                                                                |
| `services`        | Servicios, precio, duración, capacidad, estado y asignación a profesionales                             |
| `employees`       | Profesionales y avatares                                                                                |
| `bookings`        | Disponibilidad, horarios, descansos, ausencias, reservas y reprogramaciones                             |
| `tenant-settings` | Configuración pública, tema, branding y assets S3                                                       |
| `notifications`   | Plantillas, ICS y entrega mediante Resend                                                               |
| `reminders`       | Programación, reclamo, reintentos y recuperación de recordatorios                                       |
| `dashboard`       | Métricas resumidas por rol/tenant                                                                       |
| `reports`         | KPIs y exportación Excel                                                                                |
| `audit`           | Trazabilidad de acciones administrativas                                                                |
| `health`          | Liveness HTTP en `/api/health`                                                                          |
| `common`          | Guards, decorators, filtros, interceptores y utilidades compartidas                                     |

## Datos y aislamiento multiempresa

PostgreSQL es la fuente de verdad. TypeORM tiene `synchronize: false`; todo cambio de esquema debe ser una migración versionada.

Entidades principales:

- `Tenant`, `TenantSetting` y `PlatformSetting`.
- `User`, `AuthSession`, `AuthMfaChallenge`, `UserAccessToken` y `UserOnboardingProgress`.
- `Service` y `Employee`.
- `EmployeeScheduleRule`, `EmployeeScheduleBreak` y `EmployeeTimeOff`.
- `Booking` y `BookingItem`.
- `BookingReminder`.
- `AuditLog`.

Los usuarios tienen roles `SUPER_ADMIN` o `TENANT_ADMIN`. Los servicios filtran por `tenant_id`; un administrador de tenant no debe poder leer ni modificar registros de otro negocio. Las restricciones e índices críticos viven también en PostgreSQL para que la integridad no dependa solo del frontend.

## Flujo de reserva

1. El cliente abre `/book/[tenantSlug]`.
2. Consulta configuración pública, servicios, profesionales elegibles y disponibilidad.
3. Selecciona servicios, profesional, fecha y hora.
4. El backend vuelve a calcular duración, precio y capacidad; no confía en totales enviados por el navegador.
5. PostgreSQL valida solapes y persiste la reserva y sus snapshots de servicio.
6. Se generan emails diferentes para cliente y profesional.
7. El cliente recibe un token opaco para consultar o reprogramar sin crear una cuenta.

Los estados actuales son `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED` y `NO_SHOW`. Las citas canceladas liberan capacidad. La reserva pública y la reprogramación aceptan `Idempotency-Key`.

## Autenticación y seguridad

- Passwords con Argon2.
- Access JWT corto mantenido en memoria por el frontend.
- Refresh token rotado y almacenado como hash en una sesión de base de datos.
- Cookie refresh `HttpOnly`, `Secure` en producción y restringida a `/api/auth`.
- Double-submit CSRF para operaciones autenticadas.
- MFA TOTP y códigos de recuperación.
- Revocación individual, cierre de otras sesiones y `logout-all`.
- Rate limiting global y bloqueo temporal por intentos fallidos.
- Turnstile opcional para login, reserva y reprogramación pública.
- Helmet, CORS explícito y validación Zod/class-validator.

Los secretos nunca deben incluirse en Git. Producción los recibe mediante el secret `PRODUCTION_ENV_FILE` de GitHub.

## Assets y correo

El backend sube branding y avatares a un bucket S3 dedicado. Solo la lectura de esos objetos es pública; escritura y borrado requieren el usuario IAM limitado creado por `provision-s3.ps1`. Los backups usan otro bucket privado.

Resend entrega emails de acceso, ciclo de reserva y recordatorios. Cada entrega incluye una clave de idempotencia. Los emails de reserva pueden adjuntar un calendario ICS.

## Scheduler, worker y escalado

`APP_ROLE` controla el proceso:

- `all`: API y scheduler juntos; modo económico inicial.
- `api`: solo servidor HTTP; permite varias réplicas.
- `worker`: application context sin puerto HTTP; ejecuta scheduler.

Cada cron usa un PostgreSQL advisory lock. Si dos procesos despiertan simultáneamente, uno trabaja y el otro termina ese tick. Además:

- Una restricción única impide crear dos recordatorios equivalentes.
- El reclamo `PENDING/FAILED → PROCESSING` es un update condicional atómico.
- Un job recupera leases `PROCESSING` abandonados.
- Resend evita duplicar una entrega con `Idempotency-Key`.

En Lightsail se usa `APP_ROLE=all`. Para escalar, se cambia la API a `APP_ROLE=api` y se activa el servicio Compose `worker`. En ECS se despliegan dos servicios desde la misma imagen: API autoescalable y worker con una o más tareas protegidas por locks.

## Observabilidad

- Health check HTTP del backend y del frontend.
- Logs JSON rotados por Docker.
- Interceptor de latencia para requests lentos o fallidos.
- Estado del scheduler y resultados de batches en logs.
- Pruebas k6, Playwright, Lighthouse y SQL en `performance`.

## Calidad y cambios

El comando canónico es `pnpm run ci`: formato, lint, tipos, unit tests y builds. El workflow de producción añade PostgreSQL, migraciones, pruebas de integración y e2e antes de publicar imágenes.

Un cambio de datos debe incluir migración reversible. Un cambio de API debe actualizar sus DTOs, pruebas y consumidor frontend. Un cambio de variable pública del frontend debe desplegar una imagen nueva.

## Límites actuales

- No hay pagos integrados.
- No hay WhatsApp/SMS nativo.
- No hay sincronización con calendarios externos.
- `requires_confirmation` todavía no constituye un flujo completo diferente.
- La producción económica es Single-AZ y comparte aplicación y base de datos; sus RTO/RPO dependen de snapshots y backups.
