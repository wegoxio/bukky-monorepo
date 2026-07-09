# ADR 006 - Separar baseline de performance y pruebas de rate limit

## Estado

Aceptada.

## Contexto

Una prueba inicial agresiva de `/availability` con muchos VUs produjo muchos errores porque chocó con el rate limit público. Eso no medía el cálculo real de disponibilidad.

## Decisión

Separar dos tipos de pruebas:

1. Baseline de performance.
2. Prueba de protección anti-abuso/rate limit.

## Baseline de performance

Debe:

- Usar pocos VUs.
- Incluir pausa entre requests.
- Evitar 429.
- Medir Avg, P95, P99 y error rate.
- Documentar dataset usado.

Script:

```text
performance/k6/availability-load.js
```

## Rate limit

Debe:

- Usar más presión.
- Esperar 429 como señal válida.
- No interpretarse como lentitud del cálculo de availability.

Script:

```text
performance/k6/availability-rate-limit.js
```

## Consecuencias

Ventajas:

- Métricas más honestas.
- Menos falsos negativos.
- Seguridad y performance se evalúan por separado.

Costes:

- Hay que mantener dos perfiles de prueba.
- Los resultados deben documentarse con contexto.

## Referencia

Baseline actual:

```text
docs/performance/baselines/2026-07-06-availability-local.md
```
