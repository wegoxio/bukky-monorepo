# Baseline performance

**Fecha:** YYYY-MM-DD  
**Commit:** `<sha>`  
**Entorno:** local / staging / production  
**Dataset:** pequeño / medio / grande

## Frontend

| Ruta                 | TTFB | LCP | INP | CLS | JS transferido | Requests | Observaciones |
| -------------------- | ---: | --: | --: | --: | -------------: | -------: | ------------- |
| `/`                  |      |     |     |     |                |          |               |
| `/dashboard`         |      |     |     |     |                |          |               |
| `/bookings`          |      |     |     |     |                |          |               |
| `/reports`           |      |     |     |     |                |          |               |
| `/audit-logs`        |      |     |     |     |                |          |               |
| `/settings`          |      |     |     |     |                |          |               |
| `/book/[tenantSlug]` |      |     |     |     |                |          |               |

## Backend

| Endpoint                                          | Promedio | P95 | P99 | Error rate | RPS | Observaciones |
| ------------------------------------------------- | -------: | --: | --: | ---------: | --: | ------------- |
| `GET /public/tenants/:slug/bookings/availability` |          |     |     |            |     |               |
| `POST /public/tenants/:slug/bookings`             |          |     |     |            |     |               |
| `GET /bookings`                                   |          |     |     |            |     |               |
| `PATCH /bookings/:id/reschedule`                  |          |     |     |            |     |               |
| `GET /dashboard`                                  |          |     |     |            |     |               |
| `GET /reports`                                    |          |     |     |            |     |               |

## Base de datos

| Query                             | Tiempo | Buffers | Índice usado | Observaciones |
| --------------------------------- | -----: | ------: | ------------ | ------------- |
| Citas bloqueantes de availability |        |         |              |               |
| Horarios del profesional          |        |         |              |               |
| Descansos del profesional         |        |         |              |               |
| Ausencias del profesional         |        |         |              |               |

## Hallazgos

1.
2.
3.

## Acciones siguientes

1.
2.
3.
