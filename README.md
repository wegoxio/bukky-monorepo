# Bukky Booking

Monorepo de Bukky Booking:

- `booking-system-backend`: API NestJS.
- `booking-system-frontend`: aplicación Next.js.
- `docs`: documentación técnica viva.
- `performance`: pruebas y notas de rendimiento.
- `.github/workflows`: CI/CD.

## Desarrollo local

```powershell
pnpm install
pnpm --filter booking-system start:dev
pnpm --filter booking-system-frontend dev
```

## Quality gates locales

```powershell
pnpm ci:format
pnpm ci:lint
pnpm ci:typecheck
pnpm ci:test:unit
pnpm ci:build
```

Pruebas backend con PostgreSQL:

```powershell
pnpm --filter booking-system migration:run
pnpm ci:test:e2e:backend
$env:RUN_DB_INTEGRATION='true'; pnpm ci:test:integration:backend
```

## Flujo de ramas

- `feature-*` -> PR hacia `develop`.
- `develop` -> PR hacia `main`.
- `develop` no despliega.
- `main` despliega a producción mediante GitHub Actions + Cloud Build.

El único check que debe marcarse como obligatorio en GitHub es `CI Required`.

## CI/CD

Documentación completa:

- [CI/CD con GitHub Actions, Cloud Build y Cloud Run](docs/ci-cd-github-google-cloud.md)

Producción usa:

- GitHub Actions sin secrets en PR.
- Workload Identity Federation hacia Google Cloud.
- Cloud Build con imágenes etiquetadas por SHA.
- Cloud Run Job para migraciones.
- Cloud Run para backend y frontend.
- Smoke tests después de desplegar.

No se usan claves JSON de Google Cloud.
