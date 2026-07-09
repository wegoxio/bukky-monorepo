import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../data-source';

const tenantSlug = process.env.PERF_TENANT_SLUG || 'perf-availability-large';
const tenantName = process.env.PERF_TENANT_NAME || 'Performance Availability Large';
const employeeCount = Number(process.env.PERF_EMPLOYEE_COUNT || 20);
const serviceCount = Number(process.env.PERF_SERVICE_COUNT || 50);
const bookingCount = Number(process.env.PERF_BOOKING_COUNT || 10000);
const bookingDays = Number(process.env.PERF_BOOKING_DAYS || 90);
const targetDate = process.env.PERF_TARGET_DATE || '2026-07-23';
const timezone = process.env.PERF_TIMEZONE || 'America/Caracas';
const currency = process.env.PERF_CURRENCY || 'USD';

const toIsoUtc = (date: Date) => date.toISOString();

function utcDateFromLocalCaracas(date: string, hour: number, minute: number) {
  return new Date(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-04:00`,
  );
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function dateFromOffset(baseDate: string, offsetDays: number) {
  const date = new Date(`${baseDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function resetTenant(tenantId: string) {
  await AppDataSource.query(
    `DELETE FROM "booking_reminders" WHERE "booking_id" IN (SELECT "id" FROM "bookings" WHERE "tenant_id" = $1)`,
    [tenantId],
  );
  await AppDataSource.query(
    `DELETE FROM "booking_items" WHERE "booking_id" IN (SELECT "id" FROM "bookings" WHERE "tenant_id" = $1)`,
    [tenantId],
  );
  await AppDataSource.query(`DELETE FROM "bookings" WHERE "tenant_id" = $1`, [tenantId]);
  await AppDataSource.query(`DELETE FROM "employee_time_off" WHERE "tenant_id" = $1`, [tenantId]);
  await AppDataSource.query(`DELETE FROM "employee_schedule_breaks" WHERE "tenant_id" = $1`, [
    tenantId,
  ]);
  await AppDataSource.query(`DELETE FROM "employee_schedule_rules" WHERE "tenant_id" = $1`, [
    tenantId,
  ]);
  await AppDataSource.query(
    `DELETE FROM "service_employees" WHERE "service_id" IN (SELECT "id" FROM "services" WHERE "tenant_id" = $1)`,
    [tenantId],
  );
  await AppDataSource.query(`DELETE FROM "services" WHERE "tenant_id" = $1`, [tenantId]);
  await AppDataSource.query(`DELETE FROM "employees" WHERE "tenant_id" = $1`, [tenantId]);
}

async function main() {
  if (!Number.isInteger(employeeCount) || employeeCount < 1) {
    throw new Error('PERF_EMPLOYEE_COUNT must be an integer greater than 0.');
  }
  if (!Number.isInteger(serviceCount) || serviceCount < 1) {
    throw new Error('PERF_SERVICE_COUNT must be an integer greater than 0.');
  }
  if (!Number.isInteger(bookingCount) || bookingCount < 1) {
    throw new Error('PERF_BOOKING_COUNT must be an integer greater than 0.');
  }

  await AppDataSource.initialize();

  let tenantRows = await AppDataSource.query(
    `SELECT "id" FROM "tenants" WHERE "slug" = $1 LIMIT 1`,
    [tenantSlug],
  );

  let tenantId = tenantRows[0]?.id as string | undefined;

  if (!tenantId) {
    tenantId = randomUUID();
    await AppDataSource.query(
      `INSERT INTO "tenants" ("id", "name", "slug", "is_active", "address_line", "city", "state", "country", "postal_code", "phone", "public_email")
       VALUES ($1, $2, $3, true, 'Dataset local de performance', 'Caracas', 'Distrito Capital', 'Venezuela', '1010', '+584120000000', 'performance@bukky.local')`,
      [tenantId, tenantName, tenantSlug],
    );
  } else {
    await resetTenant(tenantId);
    await AppDataSource.query(
      `UPDATE "tenants"
       SET "name" = $2,
           "is_active" = true,
           "address_line" = 'Dataset local de performance',
           "city" = 'Caracas',
           "state" = 'Distrito Capital',
           "country" = 'Venezuela',
           "postal_code" = '1010',
           "phone" = '+584120000000',
           "public_email" = 'performance@bukky.local'
       WHERE "id" = $1`,
      [tenantId, tenantName],
    );
  }

  const employeeIds = Array.from({ length: employeeCount }, () => randomUUID());
  const serviceIds = Array.from({ length: serviceCount }, () => randomUUID());

  const employeeValues = employeeIds.map((id, index) => [
    id,
    tenantId,
    `Profesional Performance ${index + 1}`,
    `perf.employee.${index + 1}@bukky.local`,
    timezone,
    index % 2 === 0 ? 10 : 15,
  ]);

  await AppDataSource.createQueryBuilder()
    .insert()
    .into('employees')
    .values(
      employeeValues.map(([id, currentTenantId, name, email, scheduleTimezone, slotInterval]) => ({
        id,
        tenant_id: currentTenantId,
        name,
        email,
        schedule_timezone: scheduleTimezone,
        slot_interval_minutes: slotInterval,
        is_active: true,
      })),
    )
    .execute();

  const serviceValues = serviceIds.map((id, index) => {
    const duration = [30, 45, 60, 75][index % 4];
    const bufferBefore = index % 3 === 0 ? 10 : 0;
    const bufferAfter = index % 2 === 0 ? 10 : 5;
    const capacity = index % 5 === 0 ? 4 : 1;

    return {
      id,
      tenant_id: tenantId,
      name: `Servicio Performance ${index + 1}`,
      description: 'Servicio generado para pruebas locales de disponibilidad.',
      instructions: 'Llegar 10 minutos antes.',
      duration_minutes: duration,
      buffer_before_minutes: bufferBefore,
      buffer_after_minutes: bufferAfter,
      capacity,
      min_capacity: 1,
      max_capacity: capacity,
      min_party_size: 1,
      max_party_size: capacity,
      slot_capacity: capacity,
      pricing_model: 'FLAT',
      price: (20 + index).toFixed(2),
      currency,
      is_active: true,
      sort_order: index,
      requires_confirmation: index % 7 === 0,
      min_notice_minutes: 0,
      booking_window_days: 180,
    };
  });

  await AppDataSource.createQueryBuilder()
    .insert()
    .into('services')
    .values(serviceValues)
    .execute();

  const serviceEmployeeRows = serviceIds.flatMap((serviceId, serviceIndex) => {
    const primaryEmployeeIndex = serviceIndex % employeeIds.length;
    const secondaryEmployeeIndex = (serviceIndex + 1) % employeeIds.length;

    return [
      { service_id: serviceId, employee_id: employeeIds[primaryEmployeeIndex] },
      { service_id: serviceId, employee_id: employeeIds[secondaryEmployeeIndex] },
    ];
  });

  await AppDataSource.createQueryBuilder()
    .insert()
    .into('service_employees')
    .values(serviceEmployeeRows)
    .execute();

  const scheduleRows = employeeIds.flatMap((employeeId) =>
    [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      tenant_id: tenantId,
      employee_id: employeeId,
      day_of_week: dayOfWeek,
      start_time_local: '08:00',
      end_time_local: '19:00',
      is_active: true,
    })),
  );

  await AppDataSource.createQueryBuilder()
    .insert()
    .into('employee_schedule_rules')
    .values(scheduleRows)
    .execute();

  const breakRows = employeeIds.flatMap((employeeId) =>
    [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      tenant_id: tenantId,
      employee_id: employeeId,
      day_of_week: dayOfWeek,
      start_time_local: '12:30',
      end_time_local: '13:15',
      is_active: true,
    })),
  );

  await AppDataSource.createQueryBuilder()
    .insert()
    .into('employee_schedule_breaks')
    .values(breakRows)
    .execute();

  const bookingRows: Array<Record<string, unknown>> = [];
  const bookingItemRows: Array<Record<string, unknown>> = [];

  for (let index = 0; index < bookingCount; index += 1) {
    const service = serviceValues[index % serviceValues.length];
    const serviceId = service.id;
    const employeeId = employeeIds[index % employeeIds.length];
    const dayOffset = index % bookingDays;
    const date =
      index < Math.min(1000, bookingCount) ? targetDate : dateFromOffset(targetDate, dayOffset);
    const slot = index % 44;
    const startHour = 8 + Math.floor(slot / 4);
    const startMinute = (slot % 4) * 15;
    const startAt = utcDateFromLocalCaracas(date, startHour, startMinute);
    const endAt = addMinutes(startAt, service.duration_minutes);
    const busyStartAt = addMinutes(startAt, -service.buffer_before_minutes);
    const busyEndAt = addMinutes(endAt, service.buffer_after_minutes);
    const bookingId = randomUUID();
    const status = index % 17 === 0 ? 'CANCELLED' : index % 11 === 0 ? 'COMPLETED' : 'CONFIRMED';

    bookingRows.push({
      id: bookingId,
      tenant_id: tenantId,
      employee_id: employeeId,
      idempotency_key: `perf-${index}`,
      management_token_hash: null,
      management_token_expires_at: null,
      start_at_utc: toIsoUtc(startAt),
      end_at_utc: toIsoUtc(endAt),
      busy_start_at_utc: toIsoUtc(busyStartAt),
      busy_end_at_utc: toIsoUtc(busyEndAt),
      status,
      completed_at_utc: status === 'COMPLETED' ? toIsoUtc(endAt) : null,
      completed_by_user_id: null,
      cancelled_at_utc: status === 'CANCELLED' ? toIsoUtc(startAt) : null,
      cancelled_by_user_id: null,
      cancellation_reason: status === 'CANCELLED' ? 'Dato sintético de performance' : null,
      total_duration_minutes: service.duration_minutes,
      party_size: 1,
      total_price: service.price,
      currency,
      customer_name: `Cliente Performance ${index + 1}`,
      customer_email: `perf.customer.${index + 1}@bukky.local`,
      customer_phone: '+584120000000',
      customer_phone_country_iso2: 'VE',
      customer_phone_national_number: '4120000000',
      customer_phone_e164: '+584120000000',
      notes: null,
      source: index % 3 === 0 ? 'WEB' : 'ADMIN',
      created_by_user_id: null,
    });

    bookingItemRows.push({
      id: randomUUID(),
      booking_id: bookingId,
      service_id: serviceId,
      service_name_snapshot: service.name,
      duration_minutes_snapshot: service.duration_minutes,
      buffer_before_minutes_snapshot: service.buffer_before_minutes,
      buffer_after_minutes_snapshot: service.buffer_after_minutes,
      price_snapshot: service.price,
      pricing_model_snapshot: service.pricing_model,
      unit_price_snapshot: service.price,
      quantity_snapshot: 1,
      line_total_snapshot: service.price,
      currency_snapshot: currency,
      instructions_snapshot: service.instructions,
      sort_order: 0,
    });
  }

  const chunkSize = 1000;
  for (let offset = 0; offset < bookingRows.length; offset += chunkSize) {
    await AppDataSource.createQueryBuilder()
      .insert()
      .into('bookings')
      .values(bookingRows.slice(offset, offset + chunkSize))
      .execute();
  }

  for (let offset = 0; offset < bookingItemRows.length; offset += chunkSize) {
    await AppDataSource.createQueryBuilder()
      .insert()
      .into('booking_items')
      .values(bookingItemRows.slice(offset, offset + chunkSize))
      .execute();
  }

  console.log(
    JSON.stringify(
      {
        tenant: {
          id: tenantId,
          slug: tenantSlug,
          name: tenantName,
        },
        dataset: {
          employees: employeeIds.length,
          services: serviceIds.length,
          bookings: bookingRows.length,
          booking_items: bookingItemRows.length,
          target_date: targetDate,
          timezone,
        },
        k6: {
          BASE_URL: process.env.PERF_BASE_URL || 'http://localhost:3001',
          TENANT_SLUG: tenantSlug,
          SERVICE_IDS: serviceIds[0],
          EMPLOYEE_ID: employeeIds[0],
          BOOKING_DATE: targetDate,
          TIMEZONE: timezone,
        },
      },
      null,
      2,
    ),
  );
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
