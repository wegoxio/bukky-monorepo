import { PostgresAdvisoryLockService } from './postgres-advisory-lock.service';

describe('PostgresAdvisoryLockService', () => {
  const release = jest.fn();
  const connect = jest.fn();
  const query = jest.fn();
  const dataSource = {
    createQueryRunner: jest.fn(() => ({ connect, query, release })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs and unlocks work when the lock is acquired', async () => {
    query.mockResolvedValueOnce([{ acquired: true }]).mockResolvedValueOnce([{ unlocked: true }]);
    const work = jest.fn().mockResolvedValue(undefined);
    const service = new PostgresAdvisoryLockService(dataSource as never);

    await expect(service.runWithLock('bukky:test', work)).resolves.toBe(true);

    expect(work).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenNthCalledWith(
      1,
      'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired',
      ['bukky:test'],
    );
    expect(query).toHaveBeenNthCalledWith(2, 'SELECT pg_advisory_unlock(hashtextextended($1, 0))', [
      'bukky:test',
    ]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('skips work when another process owns the lock', async () => {
    query.mockResolvedValueOnce([{ acquired: false }]);
    const work = jest.fn();
    const service = new PostgresAdvisoryLockService(dataSource as never);

    await expect(service.runWithLock('bukky:test', work)).resolves.toBe(false);

    expect(work).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('unlocks and releases the connection when work fails', async () => {
    query.mockResolvedValueOnce([{ acquired: true }]).mockResolvedValueOnce([{ unlocked: true }]);
    const service = new PostgresAdvisoryLockService(dataSource as never);

    await expect(
      service.runWithLock('bukky:test', () => Promise.reject(new Error('job failed'))),
    ).rejects.toThrow('job failed');

    expect(query).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
