import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private createRefreshToken() {
    // Opaque token (stored on the client, hashed in DB).
    return randomBytes(32).toString('base64url');
  }

  private async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshToken = this.createRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const now = new Date();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.refreshSession.findUnique({
        where: { token: refreshTokenHash },
        include: { user: true },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (session.revokedAt) {
        throw new UnauthorizedException('Refresh token revoked');
      }

      if (session.expiresAt.getTime() <= now.getTime()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      await tx.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });

      const nextRefreshToken = this.createRefreshToken();
      const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshToken);
      const nextExpiresAt = new Date(
        Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      );

      await tx.refreshSession.create({
        data: {
          userId: session.userId,
          token: nextRefreshTokenHash,
          expiresAt: nextExpiresAt,
        },
      });

      const payload = {
        sub: session.user.id,
        email: session.user.email,
        role: session.user.role,
      };

      return {
        access_token: await this.jwtService.signAsync(payload),
        refresh_token: nextRefreshToken,
      };
    });
  }

  async logout(refreshToken: string) {
    const now = new Date();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.prisma.refreshSession.findUnique({
      where: { token: refreshTokenHash },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt.getTime() <= now.getTime()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (session.revokedAt) {
      return { success: true };
    }

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: now },
    });

    return { success: true };
  }
}
