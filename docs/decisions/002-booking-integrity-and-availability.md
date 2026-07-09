# ADR 002 - Integridad de reservas y cálculo de disponibilidad

## Estado

Aceptada.

## Contexto

El núcleo del producto es evitar solapes, dobles reservas y estados inconsistentes. La disponibilidad no puede depender del frontend.

## Decisión

El backend será fuente de verdad para:

- Disponibilidad.
- Precio.
- Duración.
- Capacidad.
- Buffers.
- Validación de estado.
- Reprogramación.
- Idempotencia.

La creación y reprogramación de citas deben revalidar disponibilidad dentro de la transacción.

Estados bloqueantes:

- `PENDING`
- `CONFIRMED`
- `IN_PROGRESS`

Estados finales:

- `COMPLETED`
- `CANCELLED`
- `NO_SHOW`

## Índices críticos

Para citas bloqueantes se usa:

```text
IDX_bookings_tenant_employee_status_busy_range
```

Para ausencias:

```text
IDX_employee_time_off_range
```

## Consecuencias

Ventajas:

- Evita solapes por requests concurrentes.
- Evita manipulación de precio desde frontend.
- Permite compartir capacidad cuando el servicio lo admite.
- Mantiene histórico con snapshots de `BookingItem`.

Costes:

- El cálculo de disponibilidad debe medirse con datasets grandes.
- La lógica de reprogramación debe mantener las mismas reglas que creación.
- Los índices deben revisarse contra queries reales.

## Validación actual

Se validó localmente `/availability` con:

- 100 profesionales.
- 1.000 servicios.
- 10.000 citas.

Resultado k6:

- Avg: 136.50 ms.
- P95: 248.06 ms.
- P99: 407.86 ms.
- Error rate: 0.00%.

Plan SQL:

- Citas bloqueantes usa `IDX_bookings_tenant_employee_status_busy_range`.
- Execution time aproximado: 1.131 ms.
