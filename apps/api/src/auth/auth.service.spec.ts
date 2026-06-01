import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../generated/prisma/client';
import { AuthService } from './auth.service';

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
}));

const bcrypt = await import('bcryptjs');

const makePrisma = () => ({
  user: {
    findUnique: vi.fn(),
  },
  refreshSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
});

const makeJwt = () => ({
  signAsync: vi.fn(),
});

describe('AuthService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let jwt: ReturnType<typeof makeJwt>;
  let service: AuthService;

  beforeEach(() => {
    prisma = makePrisma();
    jwt = makeJwt();
    service = new AuthService(prisma as any, jwt as any);
    (bcrypt.compare as any).mockReset();
  });

  describe('login', () => {
    it('login issues access and refresh tokens', async () => {
      (bcrypt.compare as any).mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: UserRole.MANAGER,
      });
      jwt.signAsync.mockResolvedValue('access-token');

      const result = await service.login('test@example.com', 'pw');

      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBeTypeOf('string');
      expect(prisma.refreshSession.create).toHaveBeenCalledTimes(1);
    });

    it('rejects if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('test@example.com', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects if password wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hash',
      });
      (bcrypt.compare as any).mockResolvedValue(false);
      await expect(service.login('test@example.com', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('refresh rejects invalid refresh token', async () => {
      const tx = {
        refreshSession: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('refresh rejects revoked refresh token', async () => {
      const tx = {
        refreshSession: {
          findUnique: vi.fn().mockResolvedValue({ revokedAt: new Date() }),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      await expect(service.refresh('revoked-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('refresh rejects expired refresh token', async () => {
      const tx = {
        refreshSession: {
          findUnique: vi.fn().mockResolvedValue({ expiresAt: new Date(Date.now() - 1000) }),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('refresh issues new tokens', async () => {
      const tx = {
        refreshSession: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sess-1',
            expiresAt: new Date(Date.now() + 60000),
            userId: 'user-1',
            user: { id: 'user-1', email: 'test@example.com', role: UserRole.MANAGER }
          }),
          update: vi.fn(),
          create: vi.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
      jwt.signAsync.mockResolvedValue('new-access-token');

      const result = await service.refresh('good-token');
      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBeTypeOf('string');
      expect(tx.refreshSession.update).toHaveBeenCalled();
      expect(tx.refreshSession.create).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('logout revokes a refresh token', async () => {
      prisma.refreshSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });

      const result = await service.logout('token');

      expect(result.success).toBe(true);
      expect(prisma.refreshSession.update).toHaveBeenCalledTimes(1);
    });

    it('logout rejects invalid refresh token', async () => {
      prisma.refreshSession.findUnique.mockResolvedValue(null);
      await expect(service.logout('token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('logout rejects expired refresh token', async () => {
      prisma.refreshSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        expiresAt: new Date(Date.now() - 60_000),
      });
      await expect(service.logout('token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('logout succeeds if already revoked', async () => {
      prisma.refreshSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
      });

      const result = await service.logout('token');

      expect(result.success).toBe(true);
      expect(prisma.refreshSession.update).not.toHaveBeenCalled();
    });
  });
});
