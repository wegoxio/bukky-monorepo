-- Reemplaza estos valores antes de ejecutar:
-- :tenant_id
-- :employee_id
-- :start_at_utc
-- :end_at_utc

-- Citas bloqueantes que intersectan un rango horario.
-- Debe usar índices sobre tenant_id, employee_id, estado y rango de busy_start/busy_end.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  booking.id,
  booking.tenant_id,
  booking.employee_id,
  booking.status,
  booking.party_size,
  booking.busy_start_at_utc,
  booking.busy_end_at_utc
FROM bookings booking
WHERE booking.tenant_id = :'tenant_id'
  AND booking.employee_id = :'employee_id'
  AND booking.status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
  AND booking.busy_start_at_utc < :'end_at_utc'
  AND booking.busy_end_at_utc > :'start_at_utc'
ORDER BY booking.busy_start_at_utc ASC;

-- Horarios activos del profesional.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM employee_schedule_rules rule
WHERE rule.tenant_id = :'tenant_id'
  AND rule.employee_id = :'employee_id'
  AND rule.is_active = true
ORDER BY rule.day_of_week, rule.start_time_local;

-- Descansos activos del profesional.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM employee_schedule_breaks break
WHERE break.tenant_id = :'tenant_id'
  AND break.employee_id = :'employee_id'
  AND break.is_active = true
ORDER BY break.day_of_week, break.start_time_local;

-- Ausencias activas que intersectan el rango consultado.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM employee_time_off time_off
WHERE time_off.tenant_id = :'tenant_id'
  AND time_off.employee_id = :'employee_id'
  AND time_off.is_active = true
  AND time_off.start_at_utc < :'end_at_utc'
  AND time_off.end_at_utc > :'start_at_utc'
ORDER BY time_off.start_at_utc;
