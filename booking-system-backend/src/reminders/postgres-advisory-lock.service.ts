import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PostgresAdvisoryLockService {
  private readonly logger = new Logger(PostgresAdvisoryLockService.name);

  constructor(private readonly dataSource: DataSource) {}

  async runWithLock(lockName: string, work: () => Promise<void>): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const rows = (await queryRunner.query(
        'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired',
        [lockName],
      )) as Array<{ acquired: boolean }>;

      if (!rows[0]?.acquired) {
        this.logger.debug(`Skipped ${lockName}; another replica owns the lock.`);
        return false;
      }

      try {
        await work();
        return true;
      } finally {
        await queryRunner.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [lockName]);
      }
    } finally {
      await queryRunner.release();
    }
  }
}
