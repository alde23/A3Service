import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UserRole } from '../generated/prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;
  let mockContext: Partial<ExecutionContext>;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);

    mockContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({}),
      }),
    };
  });

  it('returns true if no roles required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null as any);
    expect(guard.canActivate(mockContext as ExecutionContext)).toBe(true);
  });

  it('throws UnauthorizedException if user missing', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MANAGER]);
    expect(() => guard.canActivate(mockContext as ExecutionContext)).toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException if role insufficient', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MANAGER]);
    (mockContext.switchToHttp as any)().getRequest.mockReturnValue({
      user: { role: UserRole.TECHNICIAN },
    });
    expect(() => guard.canActivate(mockContext as ExecutionContext)).toThrow(ForbiddenException);
  });

  it('returns true if role is sufficient', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MANAGER]);
    (mockContext.switchToHttp as any)().getRequest.mockReturnValue({
      user: { role: UserRole.MANAGER },
    });
    expect(guard.canActivate(mockContext as ExecutionContext)).toBe(true);
  });
});
