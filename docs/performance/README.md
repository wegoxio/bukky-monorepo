# Performance y escalabilidad

Esta carpeta documenta mediciones, criterios y decisiones de performance del producto.

La carpeta `/performance` contiene herramientas ejecutables:

- k6 para pruebas de API.
- Playwright para flujos reales.
- Lighthouse para rutas frontend.
- SQL para `EXPLAIN ANALYZE`.
- Plantillas de resultados.

La carpeta `/docs/performance` contiene documentación interna:

- Baselines medidos.
- Decisiones técnicas relacionadas con performance.
- Criterios de aceptación.
- Lectura de resultados.

## Regla operativa

No se optimiza a ciegas.

Cada mejora de performance debe tener:

1. Baseline antes del cambio.
2. Hipótesis concreta.
3. Cambio aplicado.
4. Medición después del cambio.
5. Resultado documentado.

## Métricas principales

### Frontend

- TTFB.
- LCP.
- INP.
- CLS.
- Peso JS por ruta.
- Número de requests por vista.
- Tiempo hasta interacción útil.

### Backend

- Latencia promedio por endpoint.
- P90, P95 y P99.
- Error rate.
- Throughput.
- Logs de requests lentos.
- Tiempo de queries críticas.

### Base de datos

- `EXPLAIN ANALYZE`.
- Uso de índices.
- Buffers leídos.
- Queries con scans innecesarios.
- Queries que empeoran con volumen de citas.

## Endpoints críticos

- `GET /api/public/tenants/:tenantSlug/bookings/availability`
- `POST /api/public/tenants/:tenantSlug/bookings`
- `GET /api/bookings`
- `PATCH /api/bookings/:id/reschedule`
- `GET /api/dashboard`
- `GET /api/reports`

## Objetivos iniciales

| Métrica                  |  Objetivo |
| ------------------------ | --------: |
| `/availability` promedio |  < 250 ms |
| `/availability` P95      |  < 750 ms |
| `/availability` P99      | < 1500 ms |
| Error rate               |      < 2% |
| Crear reserva P95        | < 1000 ms |
| Listar citas P95         |  < 800 ms |
| Dashboard P95            | < 1000 ms |
| LCP flujo público        |   < 2.5 s |
| INP                      |  < 200 ms |

## Baselines actuales

- [Availability local - 2026-07-06](./baselines/2026-07-06-availability-local.md)

## Dataset grande de disponibilidad

El dataset reproducible para cerrar `/availability` se genera desde el backend:

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

El seed crea o regenera únicamente el tenant técnico `perf-availability-large`.

## Validación SQL de disponibilidad

Para comprobar que las consultas críticas usan índices:

```powershell
cd booking-system-backend
$env:DB_LOGGING='false'
$env:PERF_TENANT_SLUG='perf-availability-large'
$env:PERF_EMPLOYEE_ID='<employee-id-devuelto-por-el-seed>'
$env:PERF_TARGET_DATE='2026-07-23'
pnpm run perf:explain-availability
```

## Decisiones

- [ADR 001 - Separar baseline de performance y pruebas de rate limit](./adr-001-performance-baseline-vs-rate-limit.md)
