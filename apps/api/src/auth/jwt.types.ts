import type { UserRole } from '../generated/prisma/client';
import type { Request } from 'express';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
