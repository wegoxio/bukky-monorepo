# API y endpoints

La API usa prefijo global:

```text
/api
```

Swagger está disponible solo en desarrollo:

```text
http://localhost:3001/api/docs
http://localhost:3001/api/docs-json
http://localhost:3001/api/docs-yaml
```

En producción no deben existir esas rutas.

## Seguridad de API

Mecanismos:

- Bearer access token.
- Refresh token en cookie HttpOnly.
- Header `X-CSRF-Token` para flujos autenticados.
- Header `Idempotency-Key` en creación pública de reserva.
- Validación global con DTOs.
- Rate limiting.
- Turnstile opcional en endpoints públicos sensibles.

## Autenticación y sesiones

Rutas principales:

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
GET  /api/auth/me
```

Flujos relacionados:

- Login normal.
- Login con challenge MFA cuando MFA está activo.
- Refresh con rotación.
- Logout individual.
- Cierre de todas las sesiones.

## MFA

Rutas principales:

```text
GET  /api/auth/mfa/status
POST /api/auth/mfa/setup
POST /api/auth/mfa/confirm
POST /api/auth/mfa/disable
POST /api/auth/mfa/recovery-codes/regenerate
```

Comportamiento:

- Se usa TOTP con app autenticadora.
- El setup entrega QR.
- La activación requiere código válido.
- La desactivación y regeneración requieren verificación.
- Los códigos de recuperación se muestran para guardado seguro.

## Sesiones activas

Rutas principales:

```text
GET    /api/auth/sessions
DELETE /api/auth/sessions/:id
DELETE /api/auth/sessions
```

Uso:

- Ver dispositivos conectados.
- Identificar sesión actual.
- Cerrar sesiones no reconocidas.

## Negocios

Rutas administrativas principales:

```text
GET    /api/tenants
POST   /api/tenants
GET    /api/tenants/:id
PATCH  /api/tenants/:id
DELETE /api/tenants/:id
```

Rutas públicas:

```text
GET /api/public/tenants/:tenantSlug
```

Datos públicos esperados:

- Nombre.
- Slug.
- Branding.
- Datos de contacto públicos.
- Estado operativo.

## Servicios

Rutas principales:

```text
GET    /api/services
POST   /api/services
GET    /api/services/:id
PATCH  /api/services/:id
DELETE /api/services/:id
```

Reglas:

- El backend es fuente de verdad de precio, duración, capacidad y estado.
- El frontend no puede forzar disponibilidad ni precio.
- Los servicios se asocian a profesionales.

## Profesionales

Rutas principales:

```text
GET    /api/employees
POST   /api/employees
GET    /api/employees/:id
PATCH  /api/employees/:id
DELETE /api/employees/:id
```

Horarios:

```text
GET /api/bookings/employees/:employeeId/schedule
PUT /api/bookings/employees/:employeeId/schedule
```

El horario incluye:

- Zona horaria.
- Horas laborales.
- Descansos.

## Disponibilidad pública

Endpoint crítico:

```text
GET /api/public/tenants/:tenantSlug/bookings/availability
```

Query típica:

```text
employee_id=<uuid>
service_ids=<uuid>[,<uuid>]
date=2026-07-23
timezone=America/Caracas
party_size=1
```

Responsabilidades:

- Calcular slots disponibles.
- Respetar horarios.
- Respetar descansos.
- Respetar ausencias.
- Respetar buffers.
- Respetar capacidad.
- Respetar antelación mínima.
- Respetar ventana de reserva.

## Reservas públicas

Rutas principales:

```text
POST /api/public/tenants/:tenantSlug/bookings
GET  /api/public/bookings/manage/:token
PATCH /api/public/bookings/manage/:token/reschedule
```

La creación pública requiere:

- `Idempotency-Key`.
- Datos del cliente.
- Servicio(s).
- Profesional.
- Fecha/hora.
- Turnstile si está activo.

La gestión por token permite:

- Consultar cita segura.
- Reprogramar si estado y reglas lo permiten.

## Citas administrativas

Rutas principales:

```text
GET   /api/bookings
POST  /api/bookings
GET   /api/bookings/:id
PATCH /api/bookings/:id/status
PATCH /api/bookings/:id/reschedule
POST  /api/bookings/:id/resend-confirmation
```

Uso:

- Listado paginado.
- Filtros por estado, profesional y fecha.
- Creación manual.
- Cambio de estado.
- Reprogramación desde panel.
- Reenvío de confirmación cuando aplique.

## Reportes

Rutas principales:

```text
GET /api/reports
GET /api/reports/export
```

Métricas:

- Citas.
- Ingresos.
- Cancelaciones.
- Asistencia.
- Ticket promedio.
- Top servicios.
- Top profesionales.
- Tendencias por rango.

## Auditoría

Rutas principales:

```text
GET /api/audit-logs
```

Reglas de UX:

- No mostrar nombres técnicos de eventos al usuario final.
- No depender de IDs internos como información principal.
- Mantener mensajes entendibles.

## Configuración y branding

Rutas principales:

```text
GET   /api/settings
PATCH /api/settings
POST  /api/settings/assets/logo
POST  /api/settings/assets/favicon
```

Incluye:

- Datos del negocio.
- Theme builder.
- Logos.
- Favicon.
- QR de enlace público.

## Uploads

Uploads de assets:

- Deben ir al backend.
- El backend sube a S3.
- El frontend no recibe credenciales AWS.
- Los objetos son públicos solo si pertenecen a branding/assets.

## Documentación Swagger

Swagger documenta:

- Endpoints administrativos.
- Endpoints públicos de reserva.
- Endpoints públicos de gestión por token.
- DTOs de body/query.
- Bearer auth.
- Cookie auth.
- Header CSRF.
- Header Idempotency-Key.
- Uploads multipart.
