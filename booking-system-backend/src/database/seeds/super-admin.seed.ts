import * as argon2 from 'argon2';
import { type Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { User } from '../../users/entities/user.entity';

export const DEFAULT_SUPERADMIN_NAME = 'Bukky Admin';

export type SuperAdminSeedInput = {
  email: string;
  password?: string;
  name?: string;
};

export type SuperAdminSeedResult = {
  action: 'created' | 'updated';
  userId: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name?: string): string {
  const trimmed = name?.trim();
  return trimmed || DEFAULT_SUPERADMIN_NAME;
}

export async function seedSuperAdmin(
  usersRepo: Repository<User>,
  input: SuperAdminSeedInput,
  hashPassword: (password: string) => Promise<string> = argon2.hash,
): Promise<SuperAdminSeedResult> {
  const email = normalizeEmail(input.email);
  const name = normalizeName(input.name);

  if (!email) {
    throw new Error('SUPERADMIN_EMAIL es requerido');
  }

  const existing = await usersRepo.findOne({ where: { email } });

  if (existing) {
    existing.name = name;
    existing.role = 'SUPER_ADMIN';
    existing.tenant_id = null;
    existing.is_active = true;

    const saved = await usersRepo.save(existing);
    return { action: 'updated', userId: saved.id };
  }

  if (!input.password?.trim()) {
    throw new Error('SUPERADMIN_PASSWORD es requerido para crear el superadministrador');
  }

  const password_hash = await hashPassword(input.password);
  const user = usersRepo.create({
    name,
    email,
    password_hash,
    role: 'SUPER_ADMIN',
    tenant_id: null,
    is_active: true,
  });

  const saved = await usersRepo.save(user);
  return { action: 'created', userId: saved.id };
}

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config();

  await AppDataSource.initialize();

  try {
    const usersRepo = AppDataSource.getRepository(User);
    const result = await seedSuperAdmin(usersRepo, {
      name: process.env.SUPERADMIN_NAME,
      email: process.env.SUPERADMIN_EMAIL ?? '',
      password: process.env.SUPERADMIN_PASSWORD,
    });

    console.log(`Superadministrador ${result.action === 'created' ? 'creado' : 'actualizado'}.`);
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error('Seed de superadministrador falló:', err instanceof Error ? err.message : err);
    try {
      await AppDataSource.destroy();
    } catch {
      // La conexion puede no haberse inicializado si el error ocurrio antes de conectar.
    }
    process.exit(1);
  });
}
