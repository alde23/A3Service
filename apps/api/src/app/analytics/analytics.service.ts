import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AnalyticsPeriod, AnalyticsQueryDto } from './dto/analytics-query.dto';
import type {
  AnalyticsPeriodMeta,
  AnalyticsSeriesResponse,
  AnalyticsSummaryResponse,
} from './dto/analytics-response.dto';

type Bucket = {
  start: Date;
  end: Date;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: AnalyticsQueryDto): Promise<AnalyticsSummaryResponse> {
    const periodMeta = this.resolvePeriod(query);
    const buckets = this.buildBuckets(periodMeta);

    const earnings = await this.computeEarnings(buckets);
    const expenses = await this.computeExpenses(buckets);

    const totalEarnings = earnings.total;
    const totalExpenses = expenses.total;
    const profit = totalEarnings.minus(totalExpenses);

    return {
      period: periodMeta,
      totals: {
        earnings: totalEarnings.toFixed(2),
        expenses: totalExpenses.toFixed(2),
        profit: profit.toFixed(2),
      },
    };
  }

  async getEarnings(query: AnalyticsQueryDto): Promise<AnalyticsSeriesResponse> {
    const periodMeta = this.resolvePeriod(query);
    const buckets = this.buildBuckets(periodMeta);
    const earnings = await this.computeEarnings(buckets);

    return {
      period: periodMeta,
      total: earnings.total.toFixed(2),
      items: earnings.items.map((item) => ({
        periodStart: item.start.toISOString(),
        periodEnd: item.end.toISOString(),
        value: item.value.toFixed(2),
      })),
    };
  }

  async getExpenses(query: AnalyticsQueryDto): Promise<AnalyticsSeriesResponse> {
    const periodMeta = this.resolvePeriod(query);
    const buckets = this.buildBuckets(periodMeta);
    const expenses = await this.computeExpenses(buckets);

    return {
      period: periodMeta,
      total: expenses.total.toFixed(2),
      items: expenses.items.map((item) => ({
        periodStart: item.start.toISOString(),
        periodEnd: item.end.toISOString(),
        value: item.value.toFixed(2),
      })),
    };
  }

  async getProfitability(query: AnalyticsQueryDto): Promise<AnalyticsSeriesResponse> {
    const periodMeta = this.resolvePeriod(query);
    const buckets = this.buildBuckets(periodMeta);

    const earnings = await this.computeEarnings(buckets);
    const expenses = await this.computeExpenses(buckets);

    const items = buckets.map((bucket, index) => {
      const profit = earnings.items[index].value.minus(expenses.items[index].value);
      return {
        start: bucket.start,
        end: bucket.end,
        value: profit,
      };
    });

    const total = earnings.total.minus(expenses.total);

    return {
      period: periodMeta,
      total: total.toFixed(2),
      items: items.map((item) => ({
        periodStart: item.start.toISOString(),
        periodEnd: item.end.toISOString(),
        value: item.value.toFixed(2),
      })),
    };
  }

  private isValidIsoDateString(value: string): boolean {
    const isoDateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    const isoDateTimePattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

    if (!isoDateOnlyPattern.test(value) && !isoDateTimePattern.test(value)) {
      return false;
    }

    return !Number.isNaN(new Date(value).getTime());
  }

  private resolvePeriod(query: AnalyticsQueryDto): AnalyticsPeriodMeta {
    const period: AnalyticsPeriod = query.period ?? 'day';
    const hasInvalidStart = query.start != null && !this.isValidIsoDateString(query.start);
    const hasInvalidEnd = query.end != null && !this.isValidIsoDateString(query.end);

    if (hasInvalidStart || hasInvalidEnd) {
      throw new BadRequestException('start and end must be valid ISO date strings');
    }

    const start = query.start ? new Date(query.start) : null;
    const end = query.end ? new Date(query.end) : null;

    if ((start && !end) || (!start && end)) {
      throw new BadRequestException('start and end must be provided together');
    }

    let bucket: AnalyticsPeriodMeta['bucket'];
    switch (period) {
      case 'day':
      case 'week':
      case 'month':
        bucket = period;
        break;
      case 'custom':
        bucket = 'day';
        if (!start || !end) {
          throw new BadRequestException('custom period requires start and end');
        }
        break;
      default:
        throw new BadRequestException('period must be day, week, month, or custom');
    }

    const now = new Date();
    const resolvedEnd = end ?? now;
    let resolvedStart = start ?? this.defaultStart(bucket, resolvedEnd);

    if (resolvedStart > resolvedEnd) {
      throw new BadRequestException('start must be before end');
    }

    resolvedStart = this.startOfBucket(bucket, resolvedStart);
    const resolvedRangeEnd = this.endOfBucket(bucket, resolvedEnd);

    return {
      period,
      bucket,
      start: resolvedStart.toISOString(),
      end: resolvedRangeEnd.toISOString(),
    };
  }

  private buildBuckets(meta: AnalyticsPeriodMeta): Bucket[] {
    const start = new Date(meta.start);
    const end = new Date(meta.end);

    const buckets: Bucket[] = [];
    let cursor = start;

    while (cursor <= end) {
      const bucketStart = cursor;
      const bucketEnd = this.endOfBucket(meta.bucket, bucketStart);
      buckets.push({ start: bucketStart, end: bucketEnd });
      cursor = this.addBucket(meta.bucket, bucketStart);
    }

    return buckets;
  }

  private async computeEarnings(buckets: Bucket[]) {
    if (buckets.length === 0) {
      return { total: new Prisma.Decimal(0), items: [] as Array<Bucket & { value: Prisma.Decimal }> };
    }

    const rangeStart = buckets[0].start;
    const rangeEnd = buckets[buckets.length - 1].end;

    const laborEntries = await this.prisma.laborEntry.findMany({
      where: {
        isDeleted: false,
        serviceLog: {
          isDeleted: false,
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
      },
      select: {
        hours: true,
        hourlyRate: true,
        serviceLog: { select: { createdAt: true } },
      },
    });

    const consumedParts = await this.prisma.consumedPart.findMany({
      where: {
        isDeleted: false,
        serviceLog: {
          isDeleted: false,
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
      },
      select: {
        quantity: true,
        unitPrice: true,
        serviceLog: { select: { createdAt: true } },
      },
    });

    const bucketTotals = buckets.map(() => new Prisma.Decimal(0));

    laborEntries.forEach((entry) => {
      const value = entry.hourlyRate.mul(entry.hours);
      const index = this.findBucketIndex(buckets, entry.serviceLog.createdAt);
      if (index !== null) {
        bucketTotals[index] = bucketTotals[index].plus(value);
      }
    });

    consumedParts.forEach((part) => {
      if (!part.unitPrice) {
        return;
      }
      const value = part.unitPrice.mul(part.quantity);
      const index = this.findBucketIndex(buckets, part.serviceLog.createdAt);
      if (index !== null) {
        bucketTotals[index] = bucketTotals[index].plus(value);
      }
    });

    const total = bucketTotals.reduce((acc, current) => acc.plus(current), new Prisma.Decimal(0));
    const items = buckets.map((bucket, index) => ({
      ...bucket,
      value: bucketTotals[index],
    }));

    return { total, items };
  }

  private async computeExpenses(buckets: Bucket[]) {
    if (buckets.length === 0) {
      return { total: new Prisma.Decimal(0), items: [] as Array<Bucket & { value: Prisma.Decimal }> };
    }

    const rangeStart = buckets[0].start;
    const rangeEnd = buckets[buckets.length - 1].end;

    const expenses = await this.prisma.expense.findMany({
      where: {
        isDeleted: false,
        incurredAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: { amount: true, incurredAt: true },
    });

    const bucketTotals = buckets.map(() => new Prisma.Decimal(0));

    expenses.forEach((expense) => {
      const index = this.findBucketIndex(buckets, expense.incurredAt);
      if (index !== null) {
        bucketTotals[index] = bucketTotals[index].plus(expense.amount);
      }
    });

    const total = bucketTotals.reduce((acc, current) => acc.plus(current), new Prisma.Decimal(0));
    const items = buckets.map((bucket, index) => ({
      ...bucket,
      value: bucketTotals[index],
    }));

    return { total, items };
  }

  private findBucketIndex(buckets: Bucket[], date: Date): number | null {
    for (let i = 0; i < buckets.length; i += 1) {
      const bucket = buckets[i];
      if (date >= bucket.start && date <= bucket.end) {
        return i;
      }
    }
    return null;
  }

  private startOfBucket(bucket: AnalyticsPeriodMeta['bucket'], date: Date) {
    switch (bucket) {
      case 'day':
        return this.startOfDayUtc(date);
      case 'week':
        return this.startOfWeekUtc(date);
      case 'month':
        return this.startOfMonthUtc(date);
    }
  }

  private endOfBucket(bucket: AnalyticsPeriodMeta['bucket'], date: Date) {
    switch (bucket) {
      case 'day':
        return this.endOfDayUtc(date);
      case 'week':
        return this.endOfWeekUtc(date);
      case 'month':
        return this.endOfMonthUtc(date);
    }
  }

  private addBucket(bucket: AnalyticsPeriodMeta['bucket'], date: Date) {
    switch (bucket) {
      case 'day':
        return this.addDaysUtc(date, 1);
      case 'week':
        return this.addDaysUtc(date, 7);
      case 'month':
        return this.addMonthsUtc(date, 1);
    }
  }

  private defaultStart(bucket: AnalyticsPeriodMeta['bucket'], end: Date) {
    switch (bucket) {
      case 'day':
        return this.addDaysUtc(end, -30);
      case 'week':
        return this.addDaysUtc(end, -84);
      case 'month':
        return this.addMonthsUtc(end, -12);
    }
  }

  private startOfDayUtc(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private endOfDayUtc(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  }

  private startOfWeekUtc(date: Date) {
    const day = date.getUTCDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    start.setUTCDate(start.getUTCDate() + diff);
    return start;
  }

  private endOfWeekUtc(date: Date) {
    const start = this.startOfWeekUtc(date);
    return this.endOfDayUtc(this.addDaysUtc(start, 6));
  }

  private startOfMonthUtc(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private endOfMonthUtc(date: Date) {
    const nextMonth = this.addMonthsUtc(date, 1);
    const startOfNext = this.startOfMonthUtc(nextMonth);
    return this.endOfDayUtc(this.addDaysUtc(startOfNext, -1));
  }

  private addDaysUtc(date: Date, days: number) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private addMonthsUtc(date: Date, months: number) {
    const next = new Date(date.getTime());
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
  }
}
