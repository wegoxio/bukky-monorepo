import { seedSuperAdmin } from './super-admin.seed';
import { type User } from '../../users/entities/user.entity';

function createRepoMock(existingUser?: Partial<User>) {
  const savedUsers: Array<Partial<User>> = [];
  const repo = {
    findOne: jest.fn(() => Promise.resolve(existingUser ?? null)),
    create: jest.fn((input: Partial<User>) => ({ id: 'created-user-id', ...input })),
    save: jest.fn((input: Partial<User>) => {
      const saved = { id: input.id ?? 'saved-user-id', ...input };
      savedUsers.push(saved);
      return Promise.resolve(saved);
    }),
  };

  return { repo, savedUsers };
}

describe('seedSuperAdmin', () => {
  it('crea el administrador cuando no existe', async () => {
    const { repo } = createRepoMock();
    const result = await seedSuperAdmin(
      repo as never,
      {
        email: 'Admin@Bukky.test',
        password: 'safe-password',
      },
      () => Promise.resolve('hashed-password'),
    );

    expect(result.action).toBe('created');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bukky Admin',
        email: 'admin@bukky.test',
        password_hash: 'hashed-password',
        role: 'SUPER_ADMIN',
        tenant_id: null,
        is_active: true,
      }),
    );
  });

  it('no crea duplicados cuando el administrador ya existe', async () => {
    const { repo } = createRepoMock({
      id: 'existing-user-id',
      email: 'admin@bukky.test',
      password_hash: 'existing-hash',
    });

    const result = await seedSuperAdmin(repo as never, {
      email: 'admin@bukky.test',
      password: 'new-password',
    });

    expect(result.action).toBe('updated');
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('actualiza el nombre visible a Bukky Admin', async () => {
    const existingUser = {
      id: 'existing-user-id',
      name: 'SUPER ADMIN',
      email: 'admin@bukky.test',
      password_hash: 'existing-hash',
    };
    const { repo } = createRepoMock(existingUser);

    await seedSuperAdmin(repo as never, { email: 'admin@bukky.test' });

    expect(existingUser.name).toBe('Bukky Admin');
  });

  it('conserva el rol tecnico SUPER_ADMIN', async () => {
    const existingUser = {
      id: 'existing-user-id',
      email: 'admin@bukky.test',
      role: 'TENANT_ADMIN' as const,
      password_hash: 'existing-hash',
    };
    const { repo } = createRepoMock(existingUser);

    await seedSuperAdmin(repo as never, { email: 'admin@bukky.test' });

    expect(existingUser.role).toBe('SUPER_ADMIN');
  });

  it('no reemplaza la contrasena de un usuario existente', async () => {
    const existingUser = {
      id: 'existing-user-id',
      email: 'admin@bukky.test',
      password_hash: 'existing-hash',
    };
    const { repo } = createRepoMock(existingUser);
    const hashPassword = jest.fn(() => Promise.resolve('new-hash'));

    await seedSuperAdmin(
      repo as never,
      { email: 'admin@bukky.test', password: 'new-password' },
      hashPassword,
    );

    expect(hashPassword).not.toHaveBeenCalled();
    expect(existingUser.password_hash).toBe('existing-hash');
  });
});
