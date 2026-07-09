# Seguridad, operación y observabilidad

## Seguridad implementada

### Autenticación

- Login con email y contraseña.
- Hash de contraseña con Argon2.
- Access token JWT de vida corta.
- Refresh token en cookie HttpOnly.
- Hash del refresh token en base de datos.
- Rotación de refresh token.
- Logout individual.
- Logout de todas las sesiones.

### MFA

- MFA TOTP con app autenticadora.
- QR de configuración.
- Confirmación con código temporal.
- Códigos de recuperación.
- Desactivación protegida con código actual.
- Regeneración de códigos protegida.
- Challenge intermedio durante login cuando MFA está activo.

### Sesiones

- Registro de sesiones activas.
- Identificación de sesión actual.
- Cierre de sesiones no reconocidas.
- Expiración de sesiones.

### Protección adicional

- CSRF para flujos autenticados.
- CORS configurable.
- Helmet.
- CSP con nonce en frontend.
- Rate limiting.
- Bloqueo temporal por intentos fallidos.
- Captcha opcional con Turnstile.
- Validación de DTOs.
- Mensajes de error no técnicos en frontend.
- Sentry con sanitización de datos sensibles.

## Datos sensibles

No deben registrarse ni enviarse a Sentry:

- Contraseñas.
- Tokens.
- Cookies.
- CSRF.
- Captcha.
- Authorization headers.
- Emails de cliente cuando no sean necesarios.
- Teléfonos.
- Notas de cliente.
- Bodies completos de requests.
- Query params sensibles.

## Auditoría y logs

La plataforma registra acciones operativas relevantes:

- Login.
- Logout.
- Refresh.
- Creación y edición de recursos.
- Invitaciones.
- Cambios de citas.
- Reprogramaciones.
- Cambios de configuración.

Reglas de presentación:

- No mostrar nombres internos de eventos a usuarios finales.
- No usar IDs como información principal.
- Mantener mensajes entendibles.
- El ID corto de log puede ayudar a soporte, pero no debe ser el centro de lectura.

## Reportes y dashboard

El sistema incluye:

- Métricas de citas.
- Métricas de ingresos.
- Cancelaciones.
- Asistencia.
- Ticket promedio.
- Tendencias por rango.
- Top servicios.
- Top profesionales.
- Exportación Excel.
- Filtros por fecha, estado, canal, agrupación y negocio según rol.

Regla de moneda:

- La moneda debe controlarse explícitamente.
- No se deben mezclar divisas sin representación clara.

## Emails

Hay plantillas separadas para:

- Cliente.
- Profesional.

El administrador de negocio no recibe todos los emails de cada cita por defecto. La operación diaria se centraliza en dashboard, citas y logs.

## Assets públicos

El backend sube logos, favicons y avatares a S3.

Ejemplos de keys:

```text
platform/bukky/assets/logo/...
platform/bukky/assets/favicon/...
tenants/{tenantId}/assets/logo/...
tenants/{tenantId}/assets/favicon/...
tenants/{tenantId}/employees/{employeeId}/avatar/...
```

Cada subida genera una key versionada con `randomUUID`.

## Swagger/OpenAPI

Disponible solo en desarrollo:

```text
http://localhost:3001/api/docs
http://localhost:3001/api/docs-json
http://localhost:3001/api/docs-yaml
```

Regla:

- Si `NODE_ENV !== development`, Swagger no se registra.

## Performance

Documentación dedicada:

```text
docs/performance/
```

Herramientas:

- k6.
- Playwright.
- Lighthouse.
- `EXPLAIN ANALYZE`.
- Interceptor backend de latencia.

Objetivos actuales:

- `/availability` promedio menor a 250 ms.
- `/availability` P95 menor a 750 ms.
- `/availability` P99 menor a 1500 ms.
- Error rate menor a 2%.
- Crear reserva P95 menor a 1000 ms.
- Listar citas P95 menor a 800 ms.
- Dashboard P95 menor a 1000 ms.
- LCP menor a 2.5 s en flujo público.
- INP menor a 200 ms.

## Checklist operativo

### Backend

- Ejecutar migraciones.
- Verificar secretos JWT y MFA.
- Verificar CORS.
- Verificar cookies seguras.
- Verificar Turnstile si está activo.
- Verificar Resend.
- Verificar S3.
- Verificar bucket público solo para assets.
- Verificar Swagger cerrado en producción.
- Verificar Sentry en backend.

### Frontend

- Verificar `NEXT_PUBLIC_API_URL`.
- Verificar `NEXT_PUBLIC_APP_DOMAIN`.
- Probar login.
- Probar login con MFA.
- Probar reserva pública.
- Probar reprogramación por token.
- Probar configuración de negocio.
- Probar theme builder.
- Probar tabla y calendario de citas.

### Emails

- Probar email de cliente.
- Probar email de profesional.
- Verificar logo.
- Verificar enlace de Google Maps.
- Verificar enlace seguro de gestión.

### S3

- Verificar subida de logo.
- Verificar URL directa.
- Verificar política pública de lectura.
- Verificar que `MAIL_ASSET_BASE_URL` no apunte a CloudFront si se decidió S3 directo.

### Sentry

- Verificar evento de prueba en backend.
- Verificar evento de prueba en frontend.
- Confirmar que no se envían cookies, tokens, emails, teléfonos ni notas.
