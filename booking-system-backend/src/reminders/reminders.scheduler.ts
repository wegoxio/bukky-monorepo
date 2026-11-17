import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { RemindersService } from './reminders.service';
import { PostgresAdvisoryLockService } from './postgres-advisory-lock.service';

const REMINDER_CRON_JOB_NAMES = [
  'booking-reminders-dispatch',
  'booking-reminders-backfill',
  'booking-reminders-processor',
  'booking-reminders-recovery',
] as const;

@Injectable()
export class RemindersScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    private readonly remindersService: RemindersService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly advisoryLock: PostgresAdvisoryLockService,
  ) {}

  onModuleInit(): void {
    const appRole = this.configService.get<string>('APP_ROLE', 'all');
    const schedulerEnabled = this.configService.get<boolean>('REMINDERS_SCHEDULER_ENABLED', true);
    if (appRole === 'api' || !schedulerEnabled) {
      this.logger.log('Reminder scheduler disabled for this process.');
      return;
    }

    this.registerCronJob('booking-reminders-dispatch', this.buildDispatchCronExpression(), () =>
      this.handleDispatchTick(),
    );
    this.registerCronJob(
      'booking-reminders-backfill',
      this.configService.get<string>('REMINDERS_BACKFILL_CRON', '0 0,30 * * * *'),
      () => this.handleBackfillTick(),
    );
    this.registerCronJob(
      'booking-reminders-processor',
      this.configService.get<string>('REMINDERS_PROCESSOR_CRON', '15 0,30 * * * *'),
      () => this.handleProcessingTick(),
    );
    this.registerCronJob(
      'booking-reminders-recovery',
      this.configService.get<string>('REMINDERS_RECOVERY_CRON', '45 0,30 * * * *'),
      () => this.handleRecoveryTick(),
    );
  }

  onModuleDestroy(): void {
    for (const jobName of REMINDER_CRON_JOB_NAMES) {
      if (!this.schedulerRegistry.doesExist('cron', jobName)) {
        continue;
      }

      const job = this.schedulerRegistry.getCronJob(jobName);
      void job.stop();
      this.schedulerRegistry.deleteCronJob(jobName);
    }
  }

  async handleDispatchTick(): Promise<void> {
    await this.runExclusive('dispatch', async () => {
      await this.remindersService.dispatchTomorrowRemindersIfDue();
    });
  }

  async handleBackfillTick(): Promise<void> {
    await this.runExclusive('backfill', async () => {
      await this.remindersService.backfillMissedTomorrowReminders();
    });
  }

  async handleProcessingTick(): Promise<void> {
    await this.runExclusive('processor', async () => {
      await this.remindersService.processDueReminders();
    });
  }

  async handleRecoveryTick(): Promise<void> {
    await this.runExclusive('recovery', async () => {
      await this.remindersService.recoverStuckProcessingReminders();
    });
  }

  private async runExclusive(job: string, handler: () => Promise<void>): Promise<void> {
    await this.advisoryLock.runWithLock(`bukky:reminders:${job}`, handler);
  }

  private buildDispatchCronExpression(): string {
    const hour = this.configService.get<number>('REMINDERS_DISPATCH_HOUR', 17);
    const minute = this.configService.get<number>('REMINDERS_DISPATCH_MINUTE', 0);

    return `0 ${minute} ${hour} * * *`;
  }

  private registerCronJob(
    name: (typeof REMINDER_CRON_JOB_NAMES)[number],
    cronTime: string,
    handler: () => Promise<void>,
  ): void {
    if (this.schedulerRegistry.doesExist('cron', name)) {
      const existingJob = this.schedulerRegistry.getCronJob(name);
      void existingJob.stop();
      this.schedulerRegistry.deleteCronJob(name);
    }

    const timeZone = this.configService.get<string>('REMINDERS_TIMEZONE', 'America/Caracas');

    const job = new CronJob(
      cronTime,
      () => {
        void this.runJob(name, handler);
      },
      null,
      false,
      timeZone,
    );

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.log(
      `Registered cron job "${name}" with schedule "${cronTime}" in timezone "${timeZone}".`,
    );
  }

  private async runJob(
    name: (typeof REMINDER_CRON_JOB_NAMES)[number],
    handler: () => Promise<void>,
  ): Promise<void> {
    try {
      await handler();
    } catch (error) {
      this.logger.error(`Cron job "${name}" failed: ${String(error)}`);
    }
  }
}
