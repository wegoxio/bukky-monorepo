# Cloud Run Jobs para migraciones y seed de base de datos

## Arquitectura

El backend HTTP se despliega como servicio Cloud Run normal:

- Proyecto: `bukky-production`
- Region: `us-central1`
- Servicio HTTP: `bukky-backend`
- Cuenta runtime: `bukky-backend-runtime@bukky-production.iam.gserviceaccount.com`
- Imagen HTTP: `bukky-backend`

Las operaciones de base de datos usan una imagen separada:

- Imagen operations: `bukky-backend-ops`
- Job de migraciones: `bukky-db-migrate`
- Job de seed superadmin: `bukky-seed-superadmin`

La imagen operations se construye desde la raiz del monorepo con:

```powershell
docker build -f booking-system-backend/Dockerfile --target operations .
```

Esto es importante porque el workspace real esta en la raiz y usa:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `booking-system-backend/package.json`
- `booking-system-frontend/package.json`

## Por que Cloud Run Jobs

Las migraciones y seeds no deben ejecutarse dentro del arranque HTTP del backend porque:

- pueden tardar mas que un request normal;
- pueden fallar y dejar el servicio HTTP inestable;
- requieren ejecucion controlada y auditable;
- deben correr con una sola task y sin paralelismo;
- no deben depender de trafico entrante.

Cloud Run Jobs permite ejecutar operaciones puntuales con la misma red y cuenta de servicio del backend, pero sin exponer endpoints administrativos.

## Build scripts aprobados en pnpm

pnpm 10 bloquea scripts de instalacion si no estan aprobados.

Este repo aprueba solo:

- `argon2`: requerido por autenticacion y por `seed:superadmin` para crear el hash inicial de password.

Este repo ignora explicitamente:

- `@scarf/scarf`: telemetria de dependencia, no requerida por runtime.
- `@sentry/cli`: util para sourcemaps, no requerido para migraciones o seeds.
- `esbuild`: no requerido para ejecutar migraciones TypeORM con `ts-node`.
- `sharp`: dependencia de frontend/imagenes, no requerida por la imagen operations.
- `unrs-resolver`: dependencia de tooling/lint, no requerida por operations.

La configuracion vive en la raiz:

- `package.json`, campo `pnpm.onlyBuiltDependencies`.
- `package.json`, campo `pnpm.ignoredBuiltDependencies`.
- `.npmrc`, como configuracion explicita para CI/Docker.

Si `pnpm ignored-builds` muestra `argon2` como ignorado, ejecutar:

```powershell
pnpm rebuild argon2
```

## Construir la imagen operations

Desde la raiz del repo:

```powershell
.\scripts\gcp\build-operations-image.ps1
```

El script:

- valida que `gcloud` exista;
- valida que `git` exista;
- exige que el proyecto activo sea `bukky-production`;
- calcula el hash corto del commit;
- ejecuta Cloud Build con `cloudbuild-operations.yaml`;
- publica una imagen inmutable:

```text
us-central1-docker.pkg.dev/bukky-production/bukky/bukky-backend-ops:<git-sha-corto>
```

No se pasan secretos durante `docker build`.

## Crear o actualizar los Jobs

Despues de construir la imagen:

```powershell
.\scripts\gcp\deploy-database-jobs.ps1 `
  -ImageUri "us-central1-docker.pkg.dev/bukky-production/bukky/bukky-backend-ops:<git-sha-corto>"
```

El script:

- describe el servicio `bukky-backend`;
- copia solo variables necesarias para base de datos;
- reutiliza referencias a Secret Manager sin leer sus valores;
- reutiliza Cloud SQL/VPC si el servicio las tiene configuradas por anotaciones;
- configura una sola task;
- configura `parallelism=1`;
- configura `max retries=0`;
- configura timeout de 15 minutos;
- configura memoria `1Gi`;
- configura CPU `1`;
- usa la cuenta `bukky-backend-runtime@bukky-production.iam.gserviceaccount.com`.

Variables copiadas para migraciones:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
DB_SSL
DB_LOGGING
DB_POOL_MAX
DB_POOL_IDLE_TIMEOUT_MS
DB_POOL_CONNECTION_TIMEOUT_MS
DB_POOL_KEEP_ALIVE
```

Variables adicionales para el seed:

```text
SUPERADMIN_EMAIL
SUPERADMIN_PASSWORD
SUPERADMIN_NAME
```

Por defecto el script espera estos secretos:

```text
bukky-superadmin-email
bukky-superadmin-password
bukky-superadmin-name
```

Puedes cambiar esos nombres con:

```powershell
.\scripts\gcp\deploy-database-jobs.ps1 `
  -ImageUri "<image-uri>" `
  -SuperadminEmailSecret "<secret-email>" `
  -SuperadminPasswordSecret "<secret-password>" `
  -SuperadminNameSecret "<secret-name>"
```

## Ejecutar migraciones

No ejecutar sin revisar primero la imagen y el Job.

Comando preparado:

```powershell
.\scripts\gcp\run-migrations.ps1
```

El script:

- muestra proyecto, region, Job e imagen;
- pide escribir `EJECUTAR`;
- ejecuta con `--wait`;
- falla si el Job falla;
- muestra un comando para consultar logs.

## Ejecutar seed de superadministrador

Comando preparado:

```powershell
.\scripts\gcp\run-superadmin-seed.ps1
```

El script:

- muestra proyecto, region, Job e imagen;
- pide escribir `EJECUTAR`;
- ejecuta con `--wait`;
- no imprime email, password, tokens ni secretos;
- muestra un comando para consultar logs.

## Logs

Ejemplo:

```powershell
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=bukky-db-migrate" `
  --project=bukky-production `
  --limit=50 `
  --format="value(textPayload)"
```

Para el seed:

```powershell
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=bukky-seed-superadmin" `
  --project=bukky-production `
  --limit=50 `
  --format="value(textPayload)"
```

## Actualizar imagen despues de nuevos commits

Cada cambio en migraciones, entidades, data-source, seeds o dependencias requiere:

```powershell
.\scripts\gcp\build-operations-image.ps1
.\scripts\gcp\deploy-database-jobs.ps1 -ImageUri "<nueva-image-uri>"
```

Cambiar solo el seed no obliga a desplegar una nueva revision HTTP, pero si obliga a reconstruir la imagen operations y actualizar el Job.

## Rotar secretos

Rotar secretos en Secret Manager sin leer valores desde scripts:

1. Crear nueva version del secreto.
2. Mantener el Job apuntando a `latest`, o actualizarlo a una version fija si se quiere mayor control.
3. Ejecutar `deploy-database-jobs.ps1` para refrescar la definicion del Job si cambian nombres de secretos.
4. Confirmar que la cuenta runtime tiene `roles/secretmanager.secretAccessor` sobre esos secretos.

No crear claves JSON de service accounts.

## Si una migracion falla

1. No ejecutar `migration:revert` automaticamente.
2. Revisar logs del Job.
3. Revisar estado de la tabla de migraciones de TypeORM.
4. Determinar si la migracion fallo antes o despues de aplicar cambios parciales.
5. Preparar una migracion correctiva o una reversa revisada manualmente.
6. Probar en staging o una copia de la base antes de produccion.

## Seed idempotente

El seed de superadministrador:

- busca por email normalizado;
- crea el usuario si no existe;
- actualiza nombre visible a `Bukky Admin` si ya existe;
- conserva el rol tecnico `SUPER_ADMIN`;
- no crea duplicados;
- no reemplaza `password_hash` si el usuario ya existe.

Esto permite reejecutar el seed sin romper accesos existentes.

## Permisos necesarios

La cuenta:

```text
bukky-backend-runtime@bukky-production.iam.gserviceaccount.com
```

debe tener `roles/secretmanager.secretAccessor` sobre los secretos usados por los Jobs.

Preferencia:

- otorgar permisos por secreto;
- evitar permisos amplios a nivel proyecto;
- no crear claves JSON.
