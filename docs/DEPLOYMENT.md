# Arquitectura y operación de producción en AWS

## Arquitectura actual

La primera etapa prioriza coste y simplicidad operativa:

```text
DNS
 │
 ▼
Lightsail Ubuntu, IP estática, 2 vCPU / 4 GB
 ├── Caddy: TLS, HTTP/2/3 y reverse proxy
 ├── Next.js standalone
 ├── NestJS API + scheduler (`APP_ROLE=all`)
 └── PostgreSQL 16, volumen Docker persistente
       └── pg_dump diario → S3 privado

NestJS ── assets públicos ──► S3 assets
NestJS ── emails ───────────► Resend
```

No existe ALB, NAT Gateway, RDS ni ECS en esta etapa. Solo Caddy publica `80/443`; PostgreSQL y los contenedores de aplicación viven en una red Docker privada.

## Archivos operativos

- `compose.yaml`: servicios, redes, volúmenes, health checks y rotación de logs.
- `Caddyfile`: dominios, certificados y proxy.
- `.env.production.example`: contrato completo de configuración.
- `install-host.sh`: instala Docker, Compose, AWS CLI y cron de backups.
- `deploy.sh`: pull, migración, actualización saludable y limpieza de imágenes.
- `rollback.sh`: restaura una imagen anterior por SHA.
- `backup-postgres.sh`: dump comprimido y cifrado hacia S3.
- `provision-lightsail.ps1`: crea instancia, snapshot, IP y firewall.
- `provision-s3.ps1`: crea buckets y usuario IAM de mínimo privilegio.

## Requisitos previos

- Cuenta AWS y AWS CLI autenticada.
- Dominio administrable.
- Repositorio GitHub con Actions y Packages habilitados.
- Cuenta Resend y Cloudflare Turnstile.
- Key pair de Lightsail llamado `bukky-production`, o cambiar el parámetro.

La infraestructura actual está en `us-east-1`, elegida por cercanía y conectividad con Venezuela y Latinoamérica. Mantener instancia y buckets en la misma región.

## 1. Crear almacenamiento

Desde PowerShell:

```powershell
cd ops/aws-lightsail
./provision-s3.ps1 `
  -Region us-east-1 `
  -AssetsBucket bukky-public-assets-production `
  -BackupsBucket bukky-database-backups-production
```

El script imprime una access key una sola vez. Guardarla en un password manager y en `PRODUCTION_ENV_FILE`. No volver a ejecutar la creación de access key sin revocar primero la anterior.

El bucket de assets permite `GetObject` público porque la aplicación genera URLs directas. El bucket de backups conserva bloqueo público, versionado y expiración a 30 días.

## 2. Crear Lightsail

```powershell
./provision-lightsail.ps1 `
  -Region us-east-1 `
  -AvailabilityZone us-east-1a `
  -InstanceName bukky-production-app `
  -KeyPairName bukky-production
```

El script descubre el bundle Linux activo de 4 GB/USD 24, habilita snapshots diarios y asigna una IP estática. SSH queda abierto para los runners dinámicos de GitHub Actions, pero Ubuntu sólo admite autenticación mediante clave. Si se cambia a un runner con IP fija, usar `-SshCidr IP/32`. Nunca exponer `5432`.

Crear registros DNS `A`:

```text
bukky.example.com      → IP estática
api.bukky.example.com  → IP estática
```

## 3. Preparar el host

Copiar y ejecutar una sola vez:

```bash
scp install-host.sh ubuntu@IP:/tmp/
ssh ubuntu@IP
sudo bash /tmp/install-host.sh
exit
```

Reconectar para que el grupo `docker` tenga efecto. El runtime queda en `/opt/bukky`.

Configurar AWS CLI para el usuario `ubuntu` con la key limitada generada para S3. Esto permite que el cron suba backups; la misma key se entrega al backend mediante variables de entorno.

## 4. Configurar GitHub

Crear un environment llamado `production`, idealmente con aprobación manual.

Variables:

| Variable                         | Ejemplo                                    |
| -------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL`            | `https://api.bukky.example.com/api`        |
| `NEXT_PUBLIC_APP_DOMAIN`         | `https://bukky.example.com`                |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | site key pública                           |
| `PRODUCTION_BACKEND_SMOKE_URL`   | `https://api.bukky.example.com/api/health` |
| `PRODUCTION_FRONTEND_SMOKE_URL`  | `https://bukky.example.com`                |

Secrets:

| Secret                  | Contenido                                     |
| ----------------------- | --------------------------------------------- |
| `LIGHTSAIL_HOST`        | IP estática                                   |
| `LIGHTSAIL_USER`        | `ubuntu`                                      |
| `LIGHTSAIL_SSH_KEY`     | private key PEM                               |
| `LIGHTSAIL_KNOWN_HOSTS` | línea verificada de `known_hosts`             |
| `PRODUCTION_ENV_FILE`   | contenido basado en `.env.production.example` |

No incluir `BACKEND_IMAGE`, `FRONTEND_IMAGE` ni `RELEASE_SHA` en el secret: el workflow los fija para cada release.

## 5. Primer despliegue y despliegues normales

Un push a `main`:

1. Ejecuta `pnpm ci`.
2. Levanta PostgreSQL de CI, aplica migraciones y ejecuta integración/e2e.
3. Construye imágenes inmutables etiquetadas con el SHA.
4. Publica backend y frontend en GHCR.
5. Copia el bundle operativo y configuración al host.
6. Descarga imágenes.
7. Ejecuta migraciones como tarea one-shot.
8. Actualiza servicios y espera health checks.
9. Ejecuta smoke tests públicos.

También se puede iniciar manualmente desde GitHub Actions sobre `main`.

## Rollback

El despliegue conserva el SHA anterior en `/opt/bukky/.previous-release`:

```bash
cd /opt/bukky
./rollback.sh
```

O indicar un SHA conocido:

```bash
./rollback.sh 0123456789abcdef0123456789abcdef01234567
```

Las migraciones deben ser backward-compatible con al menos una versión de aplicación. `rollback.sh` no revierte automáticamente el esquema.

## Backups y restauración

El host ejecuta `backup-postgres.sh` cada día a las 02:17 UTC. Verificación:

```bash
sudo tail -n 100 /var/log/bukky-backup.log
aws s3 ls s3://bukky-database-backups-production/postgres/
```

Prueba de restauración recomendada mensual:

```bash
aws s3 cp s3://BUCKET/postgres/ARCHIVO.dump.gz /tmp/bukky.dump.gz
gunzip -c /tmp/bukky.dump.gz > /tmp/bukky.dump
DB_USER="$(sed -n 's/^DB_USER=//p' .env.production | tail -n1)"
DB_NAME="$(sed -n 's/^DB_NAME=//p' .env.production | tail -n1)"
docker compose --env-file .env.production exec -T postgres \
  pg_restore --clean --if-exists --no-owner --username="$DB_USER" --dbname="$DB_NAME" < /tmp/bukky.dump
```

La restauración es destructiva sobre la base destino. Debe probarse primero en una base temporal.

## Operación

```bash
cd /opt/bukky
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=200 backend
docker compose --env-file .env.production logs --tail=200 caddy
docker compose --env-file .env.production exec postgres pg_isready -U "$DB_USER" -d "$DB_NAME"
```

Rotar periódicamente claves SSH, token GHCR, secretos JWT/MFA, Resend y la access key IAM. Configurar AWS Budget y alertas de facturación.

## Escalado futuro

En la misma máquina se puede activar un worker independiente:

```env
BACKEND_APP_ROLE=api
COMPOSE_PROFILES=worker
```

Esto separa roles, pero no aporta alta disponibilidad mientras compartan host.

Con más presupuesto:

1. Mover PostgreSQL a RDS PostgreSQL Multi-AZ.
2. Ejecutar API y worker como servicios ECS separados.
3. Colocar ALB delante de dos o más tareas API.
4. Autoescalar API por CPU/requests.
5. Mantener worker protegido por advisory locks.
6. Cuando el volumen lo justifique, usar EventBridge Scheduler + SQS + DLQ y escalar consumidores según profundidad de cola.

La imagen y `APP_ROLE` actuales soportan esta transición sin dividir el repositorio.

## Riesgos aceptados de esta etapa

- Una sola instancia y una sola zona de disponibilidad.
- Base de datos local: una avería requiere restaurar snapshot o dump.
- Despliegues con una ventana breve de sustitución de contenedor.
- Credencial IAM de larga duración porque Lightsail no proporciona un instance profile a la aplicación.

Estas decisiones son intencionadas para minimizar coste; no equivalen a una arquitectura de alta disponibilidad.
