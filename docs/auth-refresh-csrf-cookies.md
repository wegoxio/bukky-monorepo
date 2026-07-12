# Refresh cookie y CSRF entre frontend y backend

## Contexto

Produccion usa hosts diferentes dentro del mismo sitio:

- Frontend: `https://app.bukky.wegox.io`
- Backend: `https://api.bukky.wegox.io`
- API publica: `https://api.bukky.wegox.io/api`

Aunque ambos comparten el sitio `bukky.wegox.io`, el navegador trata `app.bukky.wegox.io` y `api.bukky.wegox.io` como hosts distintos para lectura de cookies desde JavaScript.

## Cookies

### Refresh token

La cookie `bukky_refresh` contiene el refresh token.

Debe ser:

- `HttpOnly=true`
- `Secure=true` en produccion
- `SameSite=Lax`
- `Path=/api/auth`
- host-only en `api.bukky.wegox.io` o `Domain=api.bukky.wegox.io`

No debe ser legible desde JavaScript.

### CSRF token

La cookie `bukky_csrf` contiene un token aleatorio usado para double-submit CSRF.

Debe ser:

- `HttpOnly=false`
- `Secure=true` en produccion
- `SameSite=Lax`
- `Path=/`
- `Domain=bukky.wegox.io` en produccion

Debe ser legible desde JavaScript en `app.bukky.wegox.io`, porque el frontend debe copiar su valor al header `x-csrf-token`.

## Por que localhost funcionaba

En local normalmente frontend y backend usan `localhost` con puertos distintos. Las cookies host-only de `localhost` pueden ser visibles para la app local segun el flujo y el navegador.

En produccion, `app.bukky.wegox.io` no puede leer una cookie limitada a `api.bukky.wegox.io`. Por eso la cookie CSRF necesita el dominio padre `bukky.wegox.io`.

## Flujo esperado

1. `POST /api/auth/login`
   - Backend crea `bukky_refresh`.
   - Backend crea `bukky_csrf`.
   - Frontend recibe `access_token`.

2. Requests autenticados
   - Frontend manda `Authorization: Bearer <access_token>`.
   - Frontend usa `credentials: include`.
   - En metodos mutables, frontend manda `x-csrf-token` si existe cookie CSRF.

3. `POST /api/auth/refresh`
   - Navegador manda `bukky_refresh` al API.
   - Frontend lee `bukky_csrf` y manda `x-csrf-token`.
   - Backend compara cookie CSRF contra header CSRF y contra el hash asociado a la sesion.

## Variables de produccion

Backend:

```env
AUTH_REFRESH_COOKIE_NAME=bukky_refresh
AUTH_REFRESH_COOKIE_PATH=/api/auth
AUTH_REFRESH_COOKIE_DOMAIN=api.bukky.wegox.io
AUTH_REFRESH_COOKIE_SAME_SITE=lax
AUTH_REFRESH_COOKIE_SECURE=true

AUTH_CSRF_COOKIE_NAME=bukky_csrf
AUTH_CSRF_COOKIE_DOMAIN=bukky.wegox.io
AUTH_CSRF_COOKIE_PATH=/
AUTH_CSRF_HEADER_NAME=x-csrf-token

CORS_ORIGINS=https://app.bukky.wegox.io
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-CSRF-Token,Idempotency-Key
```

Frontend:

```env
NEXT_PUBLIC_API_URL=https://api.bukky.wegox.io/api
NEXT_PUBLIC_APP_DOMAIN=https://app.bukky.wegox.io
NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME=bukky_csrf
NEXT_PUBLIC_AUTH_CSRF_HEADER_NAME=x-csrf-token
```

## Como comprobarlo en DevTools

No copies ni compartas valores de tokens.

En Application > Cookies:

- Para `https://api.bukky.wegox.io` debe existir `bukky_refresh` con `HttpOnly`.
- Para `https://app.bukky.wegox.io` debe existir o ser visible `bukky_csrf` bajo dominio `bukky.wegox.io`.

En Network:

- `POST /api/auth/refresh` debe incluir cookies.
- `POST /api/auth/refresh` debe incluir el header `x-csrf-token`.
- No debe existir `Access-Control-Allow-Origin: *` cuando `credentials=true`.

## Seguridad

- El refresh token nunca debe ser legible desde JavaScript.
- El token CSRF no debe contener informacion sensible.
- No usar `Domain=.wegox.io`.
- El dominio compartido maximo permitido para CSRF es `bukky.wegox.io`.
- No desactivar la validacion CSRF para resolver fallos de refresh.
