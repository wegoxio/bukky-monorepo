# Bukky Booking Frontend

Frontend web de Bukky Booking, una plataforma SaaS multiempresa para reservas, gestión de citas y operación diaria de negocios de servicios.

## Qué incluye esta aplicación

- Login de administradores con soporte para MFA.
- Restauración de sesión con refresh token y CSRF.
- Dashboard privado por rol.
- Control visual de sesiones activas.
- Configuración de seguridad con MFA y códigos de recuperación.
- Flujo público de reservas por `tenantSlug`.
- Flujo público de reprogramación mediante enlace seguro.
- Gestión de servicios, profesionales y citas.
- Vista calendario mensual, semanal y diaria para la operación de citas.
- Branding dinámico por negocio y por plataforma.
- Theme builder para identidad visual.
- Configuración general del negocio.
- QR del enlace público de reservas dentro de Configuración General.
- Onboarding visual para administradores de negocio.
- Activación de cuenta y restablecimiento de contraseña.
- Mensajes de error entendibles para usuarios finales.
- Monitoreo de errores con Sentry.

## Stack técnico

- Next.js 16.1.6
- React 19.2.3
- TypeScript
- Tailwind CSS 4
- Radix UI
- Recharts
- driver.js
- qrcode
- @sentry/nextjs

## Rutas principales

- `/`: login.
- `/forgot-password`: solicitud de recuperación o reenvío de acceso.
- `/reset-password`: definición de nueva contraseña mediante token.
- `/activate-account`: activación inicial de cuenta de administrador de negocio.
- `/book/[tenantSlug]`: reserva pública.
- `/bookings/manage/[token]`: gestión pública de una cita mediante enlace seguro.
- `/dashboard`: resumen por rol.
- `/reports`: reportes operativos.
- `/services`: gestión de servicios.
- `/employees`: gestión de profesionales.
- `/bookings`: gestión de citas.
- `/tenants`: gestión de negocios para `SUPER_ADMIN`.
- `/users`: gestión de administradores de negocio para `SUPER_ADMIN`.
- `/audit-logs`: auditoría.
- `/settings`: configuración general, theme builder y seguridad.

## Requisitos

- Node.js 20+
- pnpm
- Backend compatible levantado

## Puesta en marcha local

1. Instala dependencias:

```bash
pnpm install
```

2. Configura `.env` con al menos:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_DOMAIN=http://localhost:3000
```

3. Levanta el entorno de desarrollo:

```bash
pnpm dev
```

4. Para validar producción local:

```bash
pnpm build
pnpm start
```

## Scripts útiles

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm exec tsc --noEmit
```

## Seguridad y sesión

El frontend trabaja con:

- Access token solo en memoria.
- Refresh automático mediante cookie HttpOnly.
- CSRF para llamadas autenticadas.
- Login con MFA cuando el usuario lo tiene activo.
- Pantalla de verificación MFA.
- Panel de sesiones activas.
- Acción para cerrar otras sesiones.
- Mensajes seguros cuando el backend no está disponible.

Los errores técnicos como `NetworkError`, `Failed to fetch` o respuestas internas del servidor se traducen a mensajes entendibles para el usuario.

## Sentry

El frontend integra Sentry mediante `@sentry/nextjs`:

- Captura errores del cliente.
- Captura errores de App Router mediante `global-error.tsx`.
- Captura errores server-side con `instrumentation.ts`.
- Usa tunnel `/monitoring` para enviar eventos por el mismo origen.
- Desactiva PII por defecto.
- Filtra tokens, cookies, CSRF, emails, teléfonos, notas y contraseñas antes de enviar eventos.
- Session Replay está configurado con texto, inputs y media enmascarados.

Variables:

```env
NEXT_PUBLIC_SENTRY_ENABLED=true
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_RELEASE=2026.07.05.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.02
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.1
SENTRY_ORG=tu-org
SENTRY_FRONTEND_PROJECT=bukky-frontend
SENTRY_AUTH_TOKEN=sntrys_...
```

`SENTRY_AUTH_TOKEN` solo debe existir en el entorno de build/CI. No debe exponerse al navegador.

## Performance

La base reproducible de medición está en:

```text
../performance
```

Incluye:

- Lighthouse para medir TTFB, LCP, INP, CLS, peso JS y requests por ruta.
- Playwright con tracing para login, dashboard, citas y flujo público de reserva.
- k6 para carga de endpoints críticos.
- Plantilla de baseline para guardar resultados comparables.

Rutas mínimas a medir:

- `/`
- `/dashboard`
- `/bookings`
- `/reports`
- `/audit-logs`
- `/settings`
- `/book/[tenantSlug]`

Antes de optimizar una vista, debe existir una medición en `../performance/results/`.

## Configuración del negocio

La vista `/settings` está organizada con sidebar interno:

- General: datos del negocio y acceso administrativo.
- Theme builder: identidad visual, colores y recursos de marca.
- Seguridad: MFA y sesiones activas.

En General se pueden gestionar:

- Nombre del negocio.
- Email público del negocio.
- Teléfono con código de país.
- Dirección.
- Estado y ciudad de Venezuela mediante selects dependientes.
- Código postal.
- Solicitud de cambio de contraseña.
- Preparación de solicitud de cambio de email administrativo.

## Reservas y citas

El frontend cubre:

- Flujo público guiado por pasos.
- Selección de servicio.
- Selección de profesional.
- Selección de fecha y hora disponible.
- Captura de datos del cliente.
- Confirmación visual de la reserva.
- Mensajes claros cuando un horario ya no está disponible.
- Gestión pública de cita mediante token.
- Reprogramación desde enlace seguro.
- Reprogramación operativa desde panel para el negocio.
- Vista de citas en tabla o calendario mensual/semanal/diario.
- Panel lateral de día seleccionado con resumen de actividad.
- Citas coloreadas por estado para lectura rápida.
- Drag and drop para reprogramar citas pendientes o confirmadas con validación final del backend.
- Bloques visuales de horario no disponible cuando se filtra por profesional.
- Acciones rápidas en tablas cuando el estado de la cita lo permite.
- Detalle operativo de cita con cliente, servicios, profesional, timeline básico, notificaciones y acciones rápidas.
- Copia de resumen listo para WhatsApp desde el detalle de cita.

## Branding, QR y assets

El panel permite personalizar la identidad visual del negocio y generar el QR del enlace público de reservas.

Los logos y favicon se cargan desde las URLs entregadas por el backend. Si el backend se configura para servir assets directamente desde S3, el frontend no necesita CloudFront para mostrarlos.

## UX implementada

- Estados vacíos con acciones sugeridas.
- Botones de limpiar filtros en vistas operativas.
- Filtros con selects visuales e iconos.
- Selects de moneda con iconos.
- Date picker visual en reportes.
- Calendario operativo de citas con vista mensual, semanal y diaria.
- Badges de estado más claros.
- Feedback de carga en exportaciones.
- Textos internos reemplazados por copy entendible para usuarios.
- Eliminación de términos técnicos como `tenant` en superficies visibles.
- Validaciones de formulario para email, teléfono y campos de dirección.

## Alcance funcional validado

El estado actual del frontend cubre:

- Login seguro con captcha opcional.
- Login con MFA.
- Restauración de sesión.
- Refresh automático ante `401`.
- Dashboard con navegación según `SUPER_ADMIN` o `TENANT_ADMIN`.
- CRUD visual de servicios.
- CRUD visual de profesionales.
- Upload y visualización de avatares.
- Creación, gestión y reprogramación de citas.
- Vista calendario de citas con panel de día seleccionado.
- Detalle operativo de cita con timeline y acciones rápidas.
- Flujo público de reserva multi-step.
- Gestión pública de cita por token.
- Branding dinámico con logo, favicon, título y variables CSS.
- QR del enlace público de reservas desde Configuración General.
- Configuración general del negocio.
- Theme builder.
- Panel de MFA y sesiones.
- Tour inicial para administradores de negocio.
- Activación de cuenta y restablecimiento de contraseña por token.
- Monitoreo de errores con Sentry.

## Limitaciones conocidas

- No hay pagos integrados.
- No hay WhatsApp o SMS nativo.
- No hay sincronización con calendarios externos.
- La vista calendario usa la lista de citas existente con rango `date_from/date_to`; si un negocio supera 100 citas visibles en el periodo, conviene crear un endpoint de calendario agregado.
- La app depende de una configuración correcta de `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_DOMAIN`, cookies y CORS.
