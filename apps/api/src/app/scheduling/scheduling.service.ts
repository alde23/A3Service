import { BadRequestException, Injectable } from '@nestjs/common';
import { JobStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type TimeSlot = {
  start: Date;
  end: Date;
};

export type SuggestSlotsInput = {
  technicianId: string;
  /** ISO date string (recommended: YYYY-MM-DD) */
  date: string;
  estimatedDuration: number;
  travelBufferMinutes?: number;
};

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns true if a proposed job overlaps any non-cancelled job for the technician
   * on the same UTC day as scheduledDate.
   */
  async hasConflict(
    technicianId: string,
    scheduledDate: Date,
    estimatedDuration: number,
  ): Promise<boolean> {
    if (!technicianId || typeof technicianId !== 'string') {
      throw new BadRequestException('technicianId is required');
    }

    if (!(scheduledDate instanceof Date) || Number.isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('scheduledDate must be a valid Date');
    }

    if (!Number.isInteger(estimatedDuration) || estimatedDuration <= 0) {
      throw new BadRequestException('estimatedDuration must be a positive integer');
    }

    const { dayStart, dayEnd } = this.getUtcDayBoundsFromDate(scheduledDate);

    const jobs = await this.prisma.job.findMany({
      where: {
        technicianId,
        isDeleted: false,
        scheduledDate: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: {
          not: JobStatus.CANCELLED,
        },
      },
      select: {
        scheduledDate: true,
        estimatedDuration: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const proposedStart = scheduledDate;
    const proposedEnd = new Date(
      proposedStart.getTime() + estimatedDuration * 60_000,
    );

    for (const job of jobs) {
      // Skip jobs without a duration — they cannot form an interval.
      if (job.estimatedDuration == null) continue;

      const existingStart = job.scheduledDate;
      const existingEnd = new Date(
        existingStart.getTime() + job.estimatedDuration * 60_000,
      );

      if (this.intervalsOverlap(proposedStart, proposedEnd, existingStart, existingEnd)) {
        return true;
      }
    }

    return false;
  }

  async suggestAvailableTimeSlots(input: SuggestSlotsInput): Promise<TimeSlot[]> {
    const technicianId = input?.technicianId;
    if (!technicianId || typeof technicianId !== 'string') {
      throw new BadRequestException('technicianId is required');
    }

    if (!input?.date || typeof input.date !== 'string') {
      throw new BadRequestException('date is required');
    }

    if (!Number.isInteger(input.estimatedDuration) || input.estimatedDuration <= 0) {
      throw new BadRequestException('estimatedDuration must be a positive integer');
    }

    const travelBufferMinutes =
      input.travelBufferMinutes === undefined ? 30 : input.travelBufferMinutes;

    if (!Number.isInteger(travelBufferMinutes) || travelBufferMinutes < 0) {
      throw new BadRequestException(
        'travelBufferMinutes must be a non-negative integer',
      );
    }

    const { dayStart, dayEnd, workStart, workEnd } =
      this.getUtcDayAndWorkBounds(input.date);

    const jobs = await this.prisma.job.findMany({
      where: {
        technicianId,
        isDeleted: false,
        scheduledDate: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: {
          not: JobStatus.CANCELLED,
        },
      },
      select: {
        scheduledDate: true,
        estimatedDuration: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const busyIntervals = jobs
      .filter((job) => job.estimatedDuration != null)
      .map((job) => {
        const start = job.scheduledDate;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const end = new Date(start.getTime() + job.estimatedDuration! * 60_000);
        return { start, end };
      })
      .filter((i) => i.end > workStart && i.start < workEnd)
      .map((i) => ({
        start: i.start < workStart ? workStart : i.start,
        end: i.end > workEnd ? workEnd : i.end,
      }));

    // Merge any overlapping/adjacent busy intervals (safety).
    const mergedBusy: Array<{ start: Date; end: Date }> = [];
    for (const interval of busyIntervals) {
      const last = mergedBusy[mergedBusy.length - 1];
      if (!last) {
        mergedBusy.push(interval);
        continue;
      }

      if (interval.start.getTime() <= last.end.getTime()) {
        if (interval.end.getTime() > last.end.getTime()) {
          last.end = interval.end;
        }
        continue;
      }

      mergedBusy.push(interval);
    }

    const requiredGapMs = (input.estimatedDuration + travelBufferMinutes) * 60_000;

    const slots: TimeSlot[] = [];
    let cursor = workStart;

    for (const busy of mergedBusy) {
      if (busy.start.getTime() > cursor.getTime()) {
        const gapStart = cursor;
        const gapEnd = busy.start;
        const proposedEnd = new Date(gapStart.getTime() + requiredGapMs);
        const overlaps = this.hasOverlapWithIntervals(gapStart, proposedEnd, mergedBusy);
        if (!overlaps && gapEnd.getTime() - gapStart.getTime() >= requiredGapMs) {
          slots.push({ start: gapStart, end: gapEnd });
        }
      }
      if (busy.end.getTime() > cursor.getTime()) {
        cursor = busy.end;
      }
    }

    if (workEnd.getTime() > cursor.getTime()) {
      const gapStart = cursor;
      const gapEnd = workEnd;
      const proposedEnd = new Date(gapStart.getTime() + requiredGapMs);
      const overlaps = this.hasOverlapWithIntervals(gapStart, proposedEnd, mergedBusy);
      if (!overlaps && gapEnd.getTime() - gapStart.getTime() >= requiredGapMs) {
        slots.push({ start: gapStart, end: gapEnd });
      }
    }

    return slots;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private getUtcDayAndWorkBounds(dateInput: string): {
    dayStart: Date;
    dayEnd: Date;
    workStart: Date;
    workEnd: Date;
  } {
    // Prefer explicit YYYY-MM-DD so timezone ambiguity is eliminated.
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateInput);
    if (!match) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1; // 0-indexed
    const day = Number(match[3]);

    const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));

    // Work hours: 08:00–18:00 UTC
    const workStart = new Date(Date.UTC(year, month, day, 8, 0, 0, 0));
    const workEnd = new Date(Date.UTC(year, month, day, 18, 0, 0, 0));

    return { dayStart, dayEnd, workStart, workEnd };
  }

  private getUtcDayBoundsFromDate(date: Date): {
    dayStart: Date;
    dayEnd: Date;
  } {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));

    return { dayStart, dayEnd };
  }

  private intervalsOverlap(
    aStart: Date,
    aEnd: Date,
    bStart: Date,
    bEnd: Date,
  ): boolean {
    return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
  }

  private hasOverlapWithIntervals(
    start: Date,
    end: Date,
    intervals: Array<{ start: Date; end: Date }>,
  ): boolean {
    return intervals.some((i) => this.intervalsOverlap(start, end, i.start, i.end));
  }
}