import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

type PrivateAuthService = {
  generateRecoveryCodes(): string[];
  normalizeRecoveryCode(code: string): string;
  verifyMfaCredentialOrThrow(
    user: User,
    code: string | undefined,
    recoveryCode: string | undefined,
    options: {
      consumeRecoveryCode: boolean;
      context: { ip: string | null; user_agent: string | null };
      action: string;
    },
  ): Promise<void>;
};

describe('AuthService', () => {
  let service: AuthService;
  let privateService: PrivateAuthService;
  let usersRepo: { save: jest.Mock };
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    const configService = {
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    } as unknown as ConfigService;

    usersRepo = {
      save: jest.fn((input: unknown) => Promise.resolve(input)),
    };
    auditService = {
      log: jest.fn(),
    };

    service = new AuthService(
      configService,
      {} as JwtService,
      usersRepo as never,
      {} as never,
      {} as never,
      {} as never,
      auditService as never,
    );
    privateService = service as unknown as PrivateAuthService;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates display recovery codes and normalizes them for storage', () => {
    const recoveryCodes = privateService.generateRecoveryCodes();

    expect(recoveryCodes).toHaveLength(10);
    for (const recoveryCode of recoveryCodes) {
      expect(recoveryCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(privateService.normalizeRecoveryCode(recoveryCode)).toBe(
        recoveryCode.replace(/-/g, ''),
      );
    }
  });

  it.each([
    ['legacy hyphenated hash, submitted without hyphens', 'ABCD-EFGH-IJKL', 'ABCDEFGHIJKL'],
    ['legacy hyphenated hash, submitted lowercase', 'ABCD-EFGH-IJKL', 'abcd-efgh-ijkl'],
    ['normalized hash, submitted with hyphens', 'ABCDEFGHIJKL', 'ABCD-EFGH-IJKL'],
    ['normalized hash, submitted with spaces', 'ABCDEFGHIJKL', 'abcd efgh ijkl'],
  ])(
    'accepts recovery codes with compatible formats: %s',
    async (_label, storedCode, submittedCode) => {
      const hash = await argon2.hash(storedCode);
      const user = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        mfa_totp_secret_encrypted: 'encrypted-secret',
        mfa_recovery_code_hashes: [hash],
      } as User;

      await privateService.verifyMfaCredentialOrThrow(user, undefined, submittedCode, {
        consumeRecoveryCode: true,
        context: { ip: null, user_agent: null },
        action: 'AUTH_MFA_LOGIN_FAILED',
      });

      expect(user.mfa_recovery_code_hashes).toEqual([]);
      expect(usersRepo.save).toHaveBeenCalledWith(user);
      expect(auditService.log).not.toHaveBeenCalled();
    },
  );
});
