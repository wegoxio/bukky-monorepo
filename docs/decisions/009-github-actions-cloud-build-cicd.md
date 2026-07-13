# 009 - CI/CD con GitHub Actions, Cloud Build y Cloud Run

## Decisión

Usaremos GitHub Actions como orquestador de validación y disparador de despliegue, y Google Cloud Build como ejecutor del despliegue de producción.

El flujo será:

- `feature-*` -> PR hacia `develop`.
- `develop` -> PR hacia `main`.
- Push a `main` -> Cloud Build production.

Producción desplegará:

- backend NestJS en Cloud Run;
- frontend Next.js en Cloud Run;
- migraciones mediante Cloud Run Job existente;
- imágenes Docker etiquetadas con SHA del commit.

## Contexto

El proyecto necesita trabajo colaborativo con reglas consistentes y despliegues independientes de frontend/backend, pero controlados por un release único de monorepo.

También se requiere evitar claves JSON de Google Cloud y no exponer secretos runtime en GitHub.

## Consecuencias

Ventajas:

- CI sin secretos en pull requests.
- Deploy de producción serializado.
- Migraciones ejecutadas antes del backend.
- Frontend solo despliega si backend queda sano.
- Rollback de imágenes posible por SHA.
- Workload Identity Federation reemplaza claves JSON.

Costes:

- Requiere configurar WIF, IAM y branch protection manualmente.
- El primer deploy exige que los servicios Cloud Run y el Job de migraciones ya existan.
- Restaurar una imagen no revierte cambios de base de datos.

## Estado

Aceptado.
