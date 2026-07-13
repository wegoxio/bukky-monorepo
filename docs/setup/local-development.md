# Desarrollo local

## Requisitos

- Node.js 22.
- pnpm 10.17.1.
- PostgreSQL.
- VS Code recomendado para aplicar formato automático al guardar.
- k6 opcional para pruebas de performance.

## Estructura actual del monorepo

```text
bukky-booking/
  booking-system-backend/
  booking-system-frontend/
  docs/
  performance/
  package.json
  pnpm-workspace.yaml
  .editorconfig
  .prettierrc
```

Por ahora se mantienen los nombres `booking-system-backend` y `booking-system-frontend`. La migración física a `backend/` y `frontend/` puede hacerse después, cuando el monorepo ya esté estabilizado.

## Instalación

Instalar dependencias desde la raíz:

```powershell
pnpm install
```

No instalar dependencias por separado dentro de backend o frontend salvo una razón específica. El workspace raíz debe ser la entrada principal.

## Comandos monorepo

Ejecutar desde la raíz:

```powershell
pnpm format
pnpm format:check
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test
pnpm build
pnpm ci
```

Significado:

- `format`: aplica Prettier.
- `format:check`: valida formato sin modificar archivos.
- `lint`: valida ESLint sin modificar archivos.
- `lint:fix`: aplica fixes seguros de ESLint.
- `typecheck`: valida TypeScript.
- `test`: ejecuta pruebas unitarias configuradas para CI.
- `build`: compila backend y frontend.
- `ci`: ejecuta `format:check`, `lint`, `typecheck`, `test` y `build`.

## Formateo automático al guardar

El repo versiona configuración de VS Code en:

```text
.vscode/settings.json
.vscode/extensions.json
```

Todo desarrollador que use VS Code debe abrir la raíz del monorepo y aceptar las extensiones recomendadas:

- Prettier.
- ESLint.
- EditorConfig.

La configuración aplica:

- `editor.formatOnSave=true`.
- Prettier como formatter por defecto.
- ESLint fixes seguros al guardar.
- LF como salto de línea.
- Eliminación de espacios al final.
- Nueva línea final obligatoria.

Esto permite que `Ctrl+S` formatee `.ts`, `.tsx`, `.js`, `.json`, `.css` y `.md` con las reglas del repo.

Aunque alguien use otro editor, CI sigue siendo el gate final mediante:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
```

## Backend

Levantar backend:

```powershell
pnpm --filter booking-system start:dev
```

Ejecutar migraciones:

```powershell
pnpm --filter booking-system migration:run
```

Puerto esperado:

```text
http://localhost:3001/api
```

Si el `.env` define otro `PORT`, usar ese puerto en frontend y herramientas de performance.

## Frontend

Levantar frontend:

```powershell
pnpm --filter booking-system-frontend dev
```

URL esperada:

```text
http://localhost:3000
```

El script `dev` usa Webpack para evitar panics internos de Turbopack durante recargas de entorno o cambios rápidos de módulos en desarrollo local.

Si quieres probar Turbopack manualmente:

```powershell
pnpm --filter booking-system-frontend dev:turbo
```

## Variables backend principales

```env
NODE_ENV=development
PORT=3001
APP_PUBLIC_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=...
DB_NAME=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
MFA_ENCRYPTION_KEY=...
MFA_CHALLENGE_SECRET=...
```

## Variables frontend principales

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_DOMAIN=http://localhost:3000
```

## S3 directo para assets

Configuración recomendada sin CloudFront:

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=tu-bucket
AWS_S3_PUBLIC_BASE_URL=
MAIL_ASSET_BASE_URL=
AWS_S3_FORCE_PATH_STYLE=false
```

Reglas:

- Bucket público solo para assets.
- Credenciales AWS solo en backend.
- No usar este bucket para datos privados.
- No usar URLs `*.cloudfront.net`.
- Si `AWS_S3_PUBLIC_BASE_URL` queda vacío, el backend genera la URL directa de S3 con `AWS_REGION` y `AWS_S3_BUCKET`.

Guía completa:

```text
docs/setup/aws-s3-public-assets.md
```

## Swagger local

Disponible solo con `NODE_ENV=development`:

```text
http://localhost:3001/api/docs
http://localhost:3001/api/docs-json
http://localhost:3001/api/docs-yaml
```

## Sentry local o producción

Backend:

```env
SENTRY_ENABLED=true
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=local
SENTRY_TRACES_SAMPLE_RATE=0.02
```

Frontend:

```env
NEXT_PUBLIC_SENTRY_ENABLED=true
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_RELEASE=local
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.02
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.1
```

`SENTRY_AUTH_TOKEN` debe existir solo en CI/build para subida de sourcemaps.

## CI/CD

Estado actual:

- `.github/workflows/pull-request-validation.yml` valida PR hacia `develop` y `main`.
- `.github/workflows/deploy-production.yml` despliega producción solo desde `main`.
- `develop` no despliega.
- El único check obligatorio en GitHub debe ser `CI Required`.
- El deploy usa Google Cloud Workload Identity Federation, Cloud Build y Cloud Run.
- El deploy ya no usa Vercel ni claves JSON.

Guía completa:

```text
docs/ci-cd-github-google-cloud.md
```

GitHub Actions usa:

- Ver guía completa anterior. Esta sección histórica se mantiene solo como referencia de comandos locales.

Variables de producción se documentan en `docs/ci-cd-github-google-cloud.md`.

## Performance local

Dataset grande para availability:

```powershell
pnpm --filter booking-system seed:performance-availability
```

k6:

```powershell
$env:API_BASE_URL='http://localhost:3001/api'
$env:TENANT_SLUG='perf-availability-large'
$env:EMPLOYEE_ID='<employee-id-devuelto-por-el-seed>'
$env:SERVICE_IDS='<service-id-devuelto-por-el-seed>'
$env:BOOKING_DATE='2026-07-23'
$env:TIMEZONE='America/Caracas'
$env:TARGET_VUS='3'
$env:DURATION='2m'
$env:WARMUP_VUS='1'
$env:WARMUP_DURATION='10s'
$env:SLEEP_SECONDS='2.5'
& 'C:\Program Files\k6\k6.exe' run performance/k6/availability-load.js
```

EXPLAIN:

```powershell
pnpm --filter booking-system perf:explain-availability
```

## Checklist local mínimo

- `pnpm ci` pasa desde la raíz.
- Backend responde en `/api`.
- Frontend carga.
- Login funciona.
- Swagger carga en desarrollo.
- Reserva pública funciona.
- Reprogramación por token funciona.
- Panel de citas abre tabla y calendario.
- Sentry solo envía eventos si está habilitado.
- k6 de `/availability` pasa sin 429 cuando se usa el perfil de baseline.
