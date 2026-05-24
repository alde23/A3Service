import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type HealthResponse = {
  status: 'ok' | 'degraded';
  timestamp: string;
  database: {
    ok: boolean;
    pendingMigrations: number | null;
    error?: string;
  };
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    const timestamp = new Date().toISOString();

    try {
      const pendingRows = await this.prisma.$queryRaw<{ count: number }[]>
        `SELECT COUNT(*)::int as count FROM "_prisma_migrations" WHERE finished_at IS NULL`;
      const pending = Number(pendingRows[0]?.count ?? 0);

      return {
        status: 'ok',
        timestamp,
        database: {
          ok: true,
          pendingMigrations: pending,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database unavailable';
      return {
        status: 'degraded',
        timestamp,
        database: {
          ok: false,
          pendingMigrations: null,
          error: message,
        },
      };
    }
  }
}
