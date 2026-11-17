import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingReminder } from './entities/booking-reminder.entity';
import { RemindersScheduler } from './reminders.scheduler';
import { RemindersService } from './reminders.service';
import { PostgresAdvisoryLockService } from './postgres-advisory-lock.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookingReminder, Booking]), NotificationsModule],
  providers: [RemindersService, RemindersScheduler, PostgresAdvisoryLockService],
  exports: [RemindersService],
})
export class RemindersModule {}
