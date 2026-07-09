# Performance tooling

Esta carpeta contiene herramientas ejecutables para medir performance.

La documentación interna, baselines y decisiones están en:

```text
docs/performance
```

Regla: primero baseline, luego cambios.

## Objetivos medidos

- TTFB y carga inicial por ruta.
- Peso JS por ruta.
- Número de requests por vista.
- Latencia backend promedio, P95 y P99.
- Comportamiento de `/availability`.
- Queries lentas con `EXPLAIN ANALYZE`.
- Flujos reales con trazas de navegador.

## Variables comunes

```bash
API_BASE_URL=http://localhost:3001/api
FRONTEND_BASE_URL=http://localhost:3000
TENANT_SLUG=barberia-demo-wegox
EMPLOYEE_ID=00000000-0000-0000-0000-000000000000
SERVICE_IDS=00000000-0000-0000-0000-000000000000
BOOKING_DATE=2026-07-23
TIMEZONE=America/Caracas
```

Para endpoints protegidos:

```bash
AUTH_TOKEN=ey...
```

## Backend: logs de latencia

El backend incluye un interceptor global de performance configurable:

```env
PERFORMANCE_LOG_ENABLED=true
PERFORMANCE_LOG_ALL_REQUESTS=false
PERFORMANCE_SLOW_REQUEST_MS=750
```

Recomendación:

- Local/baseline: `PERFORMANCE_LOG_ALL_REQUESTS=true`.
- Producción: `PERFORMANCE_LOG_ALL_REQUESTS=false` y umbral entre `750` y `1500` ms.

El log incluye método, ruta, status code, duración, si fue lento y si falló. No registra body, query completa, tokens, cookies ni datos del cliente.

## Dataset grande de availability

Genera un tenant técnico aislado para pruebas locales:

```powershell
cd booking-system-backend
$env:DB_LOGGING='false'
$env:PERF_EMPLOYEE_COUNT='100'
$env:PERF_SERVICE_COUNT='1000'
$env:PERF_BOOKING_COUNT='10000'
$env:PERF_BOOKING_DAYS='120'
$env:PERF_TARGET_DATE='2026-07-23'
pnpm run seed:performance-availability
```

El seed imprime los valores exactos para k6:

```text
TENANT_SLUG
SERVICE_IDS
EMPLOYEE_ID
BOOKING_DATE
TIMEZONE
```

## k6: API

Instala k6 si no está disponible:

```bash
choco install k6
```

En Windows, si no está en PATH, ejecútalo con:

```powershell
& 'C:\Program Files\k6\k6.exe' version
```

Smoke de endpoints críticos:

```bash
k6 run performance/k6/api-smoke.js
```

Prueba específica de disponibilidad:

```bash
k6 run performance/k6/availability-load.js
```

Esta prueba debe correr por debajo del rate limit público si el objetivo es medir el cálculo real de disponibilidad. Para eso usa pocos VUs y pausas entre requests.

Ejemplo con variables:

```powershell
$env:API_BASE_URL='http://localhost:3001/api'
$env:TENANT_SLUG='perf-availability-large'
$env:EMPLOYEE_ID='<employee-id>'
$env:SERVICE_IDS='<service-id>'
$env:BOOKING_DATE='2026-07-23'
$env:TIMEZONE='America/Caracas'
$env:WARMUP_VUS='1'
$env:WARMUP_DURATION='10s'
$env:TARGET_VUS='3'
$env:DURATION='2m'
$env:SLEEP_SECONDS='2.5'
& 'C:\Program Files\k6\k6.exe' run performance/k6/availability-load.js
```

Prueba agresiva para validar rate limiting:

```powershell
$env:API_BASE_URL='http://localhost:3001/api'
$env:TENANT_SLUG='barberia-demo-wegox'
$env:EMPLOYEE_ID='<employee-id>'
$env:SERVICE_IDS='<service-id>'
$env:BOOKING_DATE='2026-07-23'
$env:VUS='10'
$env:DURATION='2m'
k6 run performance/k6/availability-rate-limit.js
```

Interpretación:

- Si `availability-load.js` falla con muchos `429`, el test está chocando con rate limit y no sirve como baseline puro.
- Si `availability-rate-limit.js` produce `429`, la protección anti-abuso está actuando.
- Para medir capacidad interna sin rate limit se debe usar un entorno controlado o elevar temporalmente límites solo en local/staging, nunca en producción.

## PostgreSQL / EXPLAIN ANALYZE

Opción recomendada: usar el DataSource del backend sin exponer credenciales.

```powershell
cd booking-system-backend
$env:DB_LOGGING='false'
$env:PERF_TENANT_SLUG='perf-availability-large'
$env:PERF_EMPLOYEE_ID='<employee-id>'
$env:PERF_TARGET_DATE='2026-07-23'
pnpm run perf:explain-availability
```

También existe un SQL manual en:

```text
performance/sql/explain-availability.sql
```

## Playwright: flujos reales

Los escenarios están en `performance/playwright/booking-critical-flows.spec.ts`.

Instalación local:

```bash
cd booking-system-frontend
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Ejecución:

```bash
cd booking-system-frontend
pnpm exec playwright test ../performance/playwright/booking-critical-flows.spec.ts --trace on
```

Variables útiles:

```bash
FRONTEND_BASE_URL=http://localhost:3000
PERF_ADMIN_EMAIL=admin@example.com
PERF_ADMIN_PASSWORD=secret
PERF_TENANT_SLUG=barberia-demo-wegox
```

## Lighthouse

Ejecutar contra producción local:

```bash
cd booking-system-frontend
pnpm build
pnpm start
```

En otra terminal:

```bash
npx lighthouse http://localhost:3000/book/barberia-demo-wegox `
  --config-path=../performance/lighthouse/lighthouse.config.cjs `
  --output=json `
  --output-path=../performance/results/lighthouse-booking.json
```

Rutas mínimas a medir:

- `/`
- `/dashboard`
- `/bookings`
- `/reports`
- `/audit-logs`
- `/settings`
- `/book/[tenantSlug]`

## Criterios iniciales de aceptación

Estos números son objetivos iniciales. Deben ajustarse con datos reales.

| Área                     | Objetivo inicial                  |
| ------------------------ | --------------------------------- |
| `/availability` promedio | < 250 ms                          |
| `/availability` P95      | < 750 ms                          |
| Crear reserva P95        | < 1000 ms                         |
| Listar citas P95         | < 800 ms                          |
| Dashboard P95            | < 1000 ms                         |
| Flujo público LCP        | < 2.5 s                           |
| INP                      | < 200 ms                          |
| JS por ruta crítica      | revisar si supera 300-400 KB gzip |

## Orden de trabajo

1. Ejecutar baseline local con dataset pequeño.
2. Ejecutar baseline con dataset medio/grande.
3. Revisar logs lentos del backend.
4. Ejecutar `EXPLAIN ANALYZE` en queries críticas.
5. Optimizar solo lo medido.
6. Guardar resultados en `docs/performance/baselines/`.
