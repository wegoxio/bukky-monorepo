import { randomUUID } from 'crypto';
import { AppDataSource } from '../src/database/data-source';
import { Tenant } from '../src/tenant/entities/tenant.entity';
import { Employee } from '../src/employees/entities/employee.entity';
import { Service } from '../src/services/entity/service.entity';
import { Booking } from '../src/bookings/entities/booking.entity';
import { EmployeeScheduleRule } from '../src/bookings/entities/employee-schedule-rule.entity';
import { EmployeeScheduleBreak } from '../src/bookings/entities/employee-schedule-break.entity';
import { EmployeeTimeOff } from '../src/bookings/entities/employee-time-off.entity';
import { BookingItem } from '../src/bookings/entities/booking-item.entity';
import { BookingsService } from '../src/bookings/bookings.service';
import { User } from '../src/users/entities/user.entity';

const describeDb = process.env.RUN_DB_INTEGRATION === 'true' ? describe : describe.skip;

describeDb('Booking capacity concurrency (PostgreSQL)', () => {
  let tenant: Tenant;
  let employee: Employee;
  let user: User;
  let serviceEntity: Service;
  let bookingsService: BookingsService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const employeeRepo = AppDataSource.getRepository(Employee);
    const serviceRepo = AppDataSource.getRepository(Service);
    const userRepo = AppDataSource.getRepository(User);

    tenant = await tenantRepo.save(
      tenantRepo.create({
        name: 'Concurrency Test',
        slug: `concurrency-${randomUUID()}`,
        is_active: true,
      }),
    );
    employee = await employeeRepo.save(
      employeeRepo.create({
        tenant_id: tenant.id,
        name: 'Concurrent Employee',
        email: `${randomUUID()}@test.local`,
        phone: null,
        phone_country_iso2: null,
        phone_national_number: null,
        phone_e164: null,
        avatar_url: null,
        avatar_key: null,
        schedule_timezone: 'UTC',
        slot_interval_minutes: 15,
        is_active: true,
      }),
    );
    user = await userRepo.save(
      userRepo.create({
        tenant_id: tenant.id,
        name: 'Concurrent Admin',
        email: `${randomUUID()}@admin.test.local`,
        password_hash: null,
        role: 'TENANT_ADMIN',
        is_active: true,
        email_verified_at: new Date(),
        invited_at: null,
        onboarding_completed_at: null,
        token_version: 0,
        failed_login_attempts: 0,
        last_failed_login_at: null,
        locked_until: null,
        last_login_at: null,
        mfa_enabled_at: null,
        mfa_totp_secret_encrypted: null,
        mfa_recovery_code_hashes: null,
        mfa_pending_secret_encrypted: null,
        mfa_pending_expires_at: null,
        mfa_last_used_at: null,
      }),
    );
    serviceEntity = serviceRepo.create({
      tenant_id: tenant.id,
      name: `Group ${randomUUID()}`,
      description: null,
      instructions: null,
      duration_minutes: 60,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
      capacity: 2,
      min_capacity: 1,
      max_capacity: 2,
      min_party_size: 1,
      max_party_size: 2,
      slot_capacity: 2,
      pricing_model: 'PER_PERSON',
      price: '10.00',
      currency: 'EUR',
      is_active: true,
      sort_order: 0,
      requires_confirmation: false,
      min_notice_minutes: 0,
      booking_window_days: 365,
      employees: [employee],
    });
    serviceEntity = await serviceRepo.save(serviceEntity);

    bookingsService = new BookingsService(
      AppDataSource.getRepository(Booking),
      AppDataSource.getRepository(EmployeeScheduleRule),
      AppDataSource.getRepository(EmployeeScheduleBreak),
      AppDataSource.getRepository(EmployeeTimeOff),
      employeeRepo,
      serviceRepo,
      tenantRepo,
      AppDataSource,
      { log: jest.fn() } as never,
      { sendBookingLifecycleNotifications: jest.fn() } as never,
    );
  });

  afterAll(async () => {
    if (tenant) {
      const bookingIds = (
        await AppDataSource.getRepository(Booking).find({
          where: { tenant_id: tenant.id },
          select: { id: true },
        })
      ).map((booking) => booking.id);

      if (bookingIds.length > 0) {
        await AppDataSource.getRepository(BookingItem)
          .createQueryBuilder()
          .delete()
          .where('booking_id IN (:...bookingIds)', { bookingIds })
          .execute();
        await AppDataSource.getRepository(Booking).delete(bookingIds);
      }

      await AppDataSource.getRepository(Tenant).delete(tenant.id);
    }
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  it('allows exactly one of two concurrent requests for the last seats', async () => {
    const command = (name: string) =>
      bookingsService.createManualBooking(
        {
          employee_id: employee.id,
          service_ids: [serviceEntity.id],
          start_at_utc: '2030-06-21T10:00:00.000Z',
          party_size: 2,
          customer_name: name,
          allow_overlap: true,
        },
        { sub: user.id, role: 'TENANT_ADMIN', tenant_id: tenant.id },
      );

    const results = await Promise.allSettled([command('A'), command('B')]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const persisted = await AppDataSource.getRepository(Booking).find({
      where: { tenant_id: tenant.id },
    });
    expect(persisted).toHaveLength(1);
    expect(persisted[0].party_size).toBe(2);
    expect(persisted[0].total_price).toBe('20.00');
  });
});
