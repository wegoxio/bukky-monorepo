# Baseline: disponibilidad pública local

**Fecha:** 2026-07-06  
**Entorno:** local  
**Endpoint:** `GET /api/public/tenants/:tenantSlug/bookings/availability`  
**Herramienta:** k6 + `EXPLAIN ANALYZE`  
**Script k6:** `performance/k6/availability-load.js`  
**Seed grande:** `booking-system-backend/src/database/seeds/performance-availability.seed.ts`

## Dataset demo inicial

```text
TENANT_SLUG=barberia-demo-bukky
SERVICE_IDS=8d8f1d11-1645-4e28-b9ea-cdfdcf6aa8e1
Servicio=Corte clásico
EMPLOYEE_ID=a7afdd49-fc92-4eb5-991b-4406dc0f5239
Profesional=Antonio
BOOKING_DATE=2026-07-23
TIMEZONE=America/Caracas
```

### Corrida 1: baseline bajo

| Métrica    | Resultado |
| ---------- | --------: |
| Requests   |        51 |
| Error rate |     0.00% |
| Avg        |  95.31 ms |
| Min        |  34.84 ms |
| Median     |  80.15 ms |
| Max        | 678.84 ms |
| P90        | 112.77 ms |
| P95        | 125.89 ms |
| P99        | 405.43 ms |

### Corrida 2: baseline moderado

| Métrica    | Resultado |
| ---------- | --------: |
| Requests   |        97 |
| Error rate |     0.00% |
| Avg        |  98.69 ms |
| Min        |  36.94 ms |
| Median     |  88.57 ms |
| Max        | 608.68 ms |
| P90        | 115.61 ms |
| P95        | 137.69 ms |
| P99        | 257.75 ms |

## Dataset grande local

Dataset técnico generado en el tenant `perf-availability-large`.

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

Salida relevante del seed:

```json
{
  "tenant": {
    "id": "68ec2da7-7a01-48cd-9781-c2021ac09cc7",
    "slug": "perf-availability-large",
    "name": "Performance Availability Large"
  },
  "dataset": {
    "employees": 100,
    "services": 1000,
    "bookings": 10000,
    "booking_items": 10000,
    "target_date": "2026-07-23",
    "timezone": "America/Caracas"
  },
  "k6": {
    "BASE_URL": "http://localhost:3001",
    "TENANT_SLUG": "perf-availability-large",
    "SERVICE_IDS": "a879097b-833a-4642-8eca-02b4da61f7e7",
    "EMPLOYEE_ID": "addc5f88-dfc4-4d8d-93f7-6b6eec4ef63b",
    "BOOKING_DATE": "2026-07-23",
    "TIMEZONE": "America/Caracas"
  }
}
```

### Corrida 3: dataset grande

Comando:

```powershell
$env:API_BASE_URL='http://localhost:3001/api'
$env:TENANT_SLUG='perf-availability-large'
$env:SERVICE_IDS='a879097b-833a-4642-8eca-02b4da61f7e7'
$env:EMPLOYEE_ID='addc5f88-dfc4-4d8d-93f7-6b6eec4ef63b'
$env:BOOKING_DATE='2026-07-23'
$env:TIMEZONE='America/Caracas'
$env:TARGET_VUS='3'
$env:DURATION='2m'
$env:WARMUP_VUS='1'
$env:WARMUP_DURATION='10s'
$env:SLEEP_SECONDS='2.5'
& 'C:\Program Files\k6\k6.exe' run performance/k6/availability-load.js
```

Resultado:

| Métrica    | Resultado |
| ---------- | --------: |
| Requests   |       182 |
| Error rate |     0.00% |
| Avg        | 136.50 ms |
| Min        |  44.46 ms |
| Median     | 123.65 ms |
| Max        | 475.48 ms |
| P90        | 182.40 ms |
| P95        | 248.06 ms |
| P99        | 407.86 ms |

## Plan SQL con dataset grande

Comando:

```powershell
cd booking-system-backend
$env:DB_LOGGING='false'
$env:PERF_TENANT_SLUG='perf-availability-large'
$env:PERF_EMPLOYEE_ID='addc5f88-dfc4-4d8d-93f7-6b6eec4ef63b'
$env:PERF_TARGET_DATE='2026-07-23'
pnpm run perf:explain-availability
```

Resultado relevante:

| Query             | Plan usado                                                         | Execution time |
| ----------------- | ------------------------------------------------------------------ | -------------: |
| Citas bloqueantes | `Index Scan using IDX_bookings_tenant_employee_status_busy_range`  |       1.131 ms |
| Horarios activos  | `Bitmap Index Scan using IDX_employee_schedule_rules_employee_id`  |       0.133 ms |
| Descansos activos | `Bitmap Index Scan using IDX_employee_schedule_breaks_employee_id` |       0.078 ms |
| Ausencias activas | `Index Scan using IDX_employee_time_off_range`                     |       0.142 ms |

## Lectura

El endpoint de disponibilidad queda validado localmente con un dataset grande de 100 profesionales, 1.000 servicios y 10.000 citas. La medición HTTP y el plan SQL confirman que el cálculo está usando índices en las tablas críticas y se mantiene por debajo de los objetivos actuales.

| Métrica    |  Objetivo | Demo bajo | Demo moderado | Dataset grande | Estado |
| ---------- | --------: | --------: | ------------: | -------------: | ------ |
| Avg        |  < 250 ms |  95.31 ms |      98.69 ms |      136.50 ms | Cumple |
| P95        |  < 750 ms | 125.89 ms |     137.69 ms |      248.06 ms | Cumple |
| P99        | < 1500 ms | 405.43 ms |     257.75 ms |      407.86 ms | Cumple |
| Error rate |      < 2% |     0.00% |         0.00% |          0.00% | Cumple |

## Hallazgos

1. El cálculo de disponibilidad es estable en local con volumen alto de servicios, profesionales y citas.
2. La query de citas bloqueantes usa el índice compuesto correcto: `IDX_bookings_tenant_employee_status_busy_range`.
3. La prueba agresiva inicial con 10 VUs no medía performance pura porque activaba el rate limit público; para benchmark de cálculo se usan VUs bajos y pausas.
4. El dataset grande queda reproducible con `pnpm run seed:performance-availability`.

## Pendiente fuera de este cierre

1. Medir creación y reprogramación de reservas con k6.
2. Medir vistas autenticadas de panel: citas, reportes y dashboard.
3. Ejecutar una prueba en staging con latencia de red real y base de datos remota.
4. Validar comportamiento con rate limit productivo y tráfico público real.
