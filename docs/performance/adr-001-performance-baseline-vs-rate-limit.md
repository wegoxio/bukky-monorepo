# ADR 001 - Separar baseline de performance y pruebas de rate limit

## Estado

Aceptada.

## Fecha

2026-07-06

## Contexto

El endpoint público de disponibilidad es crítico para el producto:

```text
GET /public/tenants/:tenantSlug/bookings/availability
```

Este endpoint está expuesto públicamente y, por tanto, debe conservar protección anti-abuso mediante rate limiting.

Durante la primera prueba k6 agresiva se ejecutaron demasiadas requests por minuto. El resultado mostró cerca de 90% de fallos. La lectura correcta no fue que el cálculo de disponibilidad estuviera caído, sino que el rate limit público estaba bloqueando gran parte del tráfico.

Mezclar ambos objetivos genera métricas incorrectas:

- Si el test choca con rate limit, el error rate sube artificialmente.
- Las respuestas `429` suelen ser rápidas y contaminan el promedio.
- Las respuestas `200` quedan mezcladas con rechazos de protección.
- No se puede concluir con precisión cuánto tarda el cálculo real de disponibilidad.

## Decisión

Se separan dos tipos de pruebas:

1. **Baseline de performance**
   - Usa `performance/k6/availability-load.js`.
   - Corre por debajo del rate limit.
   - Mide latencia real del cálculo de disponibilidad.
   - Debe registrar avg, P90, P95, P99 y error rate.

2. **Prueba de rate limit / abuso**
   - Usa `performance/k6/availability-rate-limit.js`.
   - Corre con más VUs y pausas cortas.
   - Valida que la protección anti-abuso responda con `429` cuando corresponde.
   - No se usa para evaluar la latencia pura del cálculo.

## Consecuencias

### Positivas

- Las métricas de performance quedan limpias.
- El rate limit se valida sin confundirlo con lentitud.
- Se evita recomendar optimizaciones basadas en un test mal interpretado.
- El endpoint público mantiene protección realista.

### Negativas

- Se requieren al menos dos pruebas para entender completamente el comportamiento.
- La capacidad bruta interna sin rate limit solo debe medirse en local/staging con configuración controlada.

## Criterio operativo

No se debe quitar el rate limit en producción para medir performance.

Si se quiere medir capacidad bruta sin rate limit:

1. Usar local o staging.
2. Elevar temporalmente los límites.
3. Documentar que el resultado no representa la exposición pública real.
4. Restaurar la configuración normal después de la prueba.

## Baseline asociado

- [Availability local - 2026-07-06](./baselines/2026-07-06-availability-local.md)
