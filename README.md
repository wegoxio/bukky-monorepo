# Bukky Booking

Monorepo de la plataforma SaaS multiempresa de reservas Bukky.

- `booking-system-backend`: NestJS, TypeORM y PostgreSQL.
- `booking-system-frontend`: Next.js y React.
- `ops/aws-lightsail`: despliegue productivo económico en AWS.
- `performance`: carga y flujos críticos.
- `docs`: documentación técnica consolidada.

## Requisitos

- Node.js 22.
- pnpm 10.17.1 mediante Corepack.
- Docker con Compose para PostgreSQL local.

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install --frozen-lockfile
```

## Desarrollo local

### 1. Base de datos

```bash
docker compose -f compose.local.yaml up -d
```

La configuración local predeterminada es:

```text
host: localhost
port: 5432
database: bukky
user: bukky
password: bukky_local
```

### 2. Variables del backend

Copiar `booking-system-backend/.env.example` a `booking-system-backend/.env` y configurar como mínimo:

```env
NODE_ENV=development
APP_ROLE=all
APP_PUBLIC_URL=http://localhost:3000
PORT=3001
CORS_ORIGINS=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=bukky
DB_PASSWORD=bukky_local
DB_NAME=bukky
DB_SSL=false
JWT_SECRET=local-jwt-secret-change-before-production
JWT_REFRESH_SECRET=local-refresh-secret-change-before-production
MFA_CHALLENGE_SECRET=local-mfa-secret-change-before-production
TURNSTILE_ENABLED=false
MAIL_ENABLED=false
REMINDERS_ENABLED=false
```

S3, Resend, Turnstile y recordatorios pueden permanecer desactivados para desarrollo básico.

### 3. Variables del frontend

Copiar `booking-system-frontend/.env.example` a `booking-system-frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_DOMAIN=http://localhost:3000
```

### 4. Migraciones y datos iniciales

```bash
pnpm --filter booking-system migration:run
pnpm --filter booking-system seed:superadmin
```

Las credenciales del superadministrador se toman de `SUPERADMIN_NAME`, `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD`.

### 5. Ejecutar

En dos terminales:

```bash
pnpm --filter booking-system start:dev
pnpm --filter booking-system-frontend dev
```

- Frontend: `http://localhost:3000`.
- API: `http://localhost:3001/api`.
- Health: `http://localhost:3001/api/health`.
- Swagger de desarrollo: `http://localhost:3001/api/docs`.

## Validación

El quality gate completo es:

```bash
pnpm run ci
```

Comandos separados:

```bash
pnpm ci:format
pnpm ci:lint
pnpm ci:typecheck
pnpm ci:test:unit
pnpm ci:build
```

Pruebas con PostgreSQL:

```bash
pnpm --filter booking-system migration:run
pnpm ci:test:e2e:backend
```

PowerShell:

```powershell
$env:RUN_DB_INTEGRATION='true'
pnpm ci:test:integration:backend
```

Bash:

```bash
RUN_DB_INTEGRATION=true pnpm ci:test:integration:backend
```

## Migraciones

```bash
pnpm --filter booking-system migration:status
pnpm --filter booking-system migration:run
pnpm --filter booking-system migration:revert
```

No usar `synchronize` ni modificar producción manualmente. Todo cambio de esquema debe entrar como migración y probarse contra PostgreSQL 16.

## Roles de ejecución del backend

```env
APP_ROLE=all      # API + scheduler, desarrollo y producción económica
APP_ROLE=api      # solo HTTP, para réplicas escalables
APP_ROLE=worker   # solo jobs, sin puerto HTTP
```

Los recordatorios tienen advisory locks PostgreSQL, reclamo atómico e idempotencia de email.

## Producción

El push a `main` valida, publica imágenes en GHCR y despliega a Lightsail. Antes del primer release deben configurarse AWS, DNS, host y el environment `production` de GitHub.

Consultar:

- [Estructura técnica](docs/TECHNICAL.md).
- [Arquitectura y despliegue AWS](docs/DEPLOYMENT.md).
- [Modelo de negocio y pricing](docs/business-model-and-pricing.es.md).

## Detener o reiniciar el entorno local

```bash
docker compose -f compose.local.yaml stop
docker compose -f compose.local.yaml start
```

Para borrar la base local deliberadamente:

```bash
docker compose -f compose.local.yaml down -v
```

Ese último comando elimina todos los datos locales del volumen PostgreSQL.
