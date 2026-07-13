/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import 'reflect-metadata';
import { AppDataSource } from '../data-source';

const tenantSlug = process.env.PERF_TENANT_SLUG || 'perf-availability-large';
const employeeId = process.env.PERF_EMPLOYEE_ID;
const date = process.env.PERF_TARGET_DATE || '2026-07-23';

function caracasDayRangeUtc(localDate: string) {
  return {
    startAtUtc: new Date(`${localDate}T00:00:00-04:00`),
    endAtUtc: new Date(`${localDate}T23:59:59.999-04:00`),
  };
}

function printPlan(title: string, rows: Array<{ 'QUERY PLAN': string }>) {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
  for (const row of rows) {
    console.log(row['QUERY PLAN']);
  }
}

async function main() {
  if (!employeeId) {
    throw new Error('PERF_EMPLOYEE_ID es requerido.');
  }

  await AppDataSource.initialize();

  const tenantRows = await AppDataSource.query(
    `SELECT "id" FROM "tenants" WHERE "slug" = $1 LIMIT 1`,
    [tenantSlug],
  );
  const tenantId = tenantRows[0]?.id as string | undefined;

  if (!tenantId) {
    throw new Error(`No existe un negocio con slug "${tenantSlug}".`);
  }

  const { startAtUtc, endAtUtc } = caracasDayRangeUtc(date);

  console.log(
    JSON.stringify(
      {
        tenant_slug: tenantSlug,
        tenant_id: tenantId,
        employee_id: employeeId,
        date,
        start_at_utc: startAtUtc.toISOString(),
        end_at_utc: endAtUtc.toISOString(),
      },
      null,
      2,
    ),
  );

  const blockingBookingsPlan = await AppDataSource.query(
    `
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
      WHERE booking.tenant_id = $1
        AND booking.employee_id = $2
        AND booking.status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
        AND booking.busy_start_at_utc < $4
        AND booking.busy_end_at_utc > $3
      ORDER BY booking.busy_start_at_utc ASC
    `,
    [tenantId, employeeId, startAtUtc.toISOString(), endAtUtc.toISOString()],
  );

  const scheduleRulesPlan = await AppDataSource.query(
    `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
      SELECT *
      FROM employee_schedule_rules rule
      WHERE rule.tenant_id = $1
        AND rule.employee_id = $2
        AND rule.is_active = true
      ORDER BY rule.day_of_week, rule.start_time_local
    `,
    [tenantId, employeeId],
  );

  const scheduleBreaksPlan = await AppDataSource.query(
    `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
      SELECT *
      FROM employee_schedule_breaks schedule_break
      WHERE schedule_break.tenant_id = $1
        AND schedule_break.employee_id = $2
        AND schedule_break.is_active = true
      ORDER BY schedule_break.day_of_week, schedule_break.start_time_local
    `,
    [tenantId, employeeId],
  );

  const timeOffPlan = await AppDataSource.query(
    `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
      SELECT *
      FROM employee_time_off time_off
      WHERE time_off.tenant_id = $1
        AND time_off.employee_id = $2
        AND time_off.is_active = true
        AND time_off.start_at_utc < $4
        AND time_off.end_at_utc > $3
      ORDER BY time_off.start_at_utc
    `,
    [tenantId, employeeId, startAtUtc.toISOString(), endAtUtc.toISOString()],
  );

  printPlan('Citas bloqueantes', blockingBookingsPlan);
  printPlan('Horarios activos', scheduleRulesPlan);
  printPlan('Descansos activos', scheduleBreaksPlan);
  printPlan('Ausencias activas', timeOffPlan);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
