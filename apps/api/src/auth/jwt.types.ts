import type { Role } from '@prisma/client';
import type { Request } from 'express';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

// What Passport attaches onto req.user after JwtStrategy.validate().
export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: Role;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
