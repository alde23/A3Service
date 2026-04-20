import { BadRequestException, Injectable } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type TimeSlot = {
  start: Date;
  end: Date;
};

export type SuggestSlotsInput = {
  technicianId: string;
  /** ISO date string (recommended: YYYY-MM-DD) */
  date: string;
  durationMinutes: number;
  travelBufferMinutes?: number;
};

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns true if a proposed job overlaps any non-cancelled job for the technician
   * on the same UTC day as scheduledAt.
   */
  async hasConflict(
    technicianId: string,
    scheduledAt: Date,
    durationMinutes: number,
  ): Promise<boolean> {
    if (!technicianId || typeof technicianId !== 'string') {
      throw new BadRequestException('technicianId is required');
    }

    if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt must be a valid Date');
    }

    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      throw new BadRequestException('durationMinutes must be a positive integer');
    }

    const { dayStart, dayEnd } = this.getUtcDayBoundsFromDate(scheduledAt);

    const jobs = await this.prisma.job.findMany({
      where: {
        technicianId,
        scheduledAt: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: {
          not: JobStatus.CANCELLED,
        },
      },
      select: {
        scheduledAt: true,
        durationMinutes: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const proposedStart = scheduledAt;
    const proposedEnd = new Date(
      proposedStart.getTime() + durationMinutes * 60_000,
    );

    for (const job of jobs) {
      const existingStart = job.scheduledAt;
      const existingEnd = new Date(
        existingStart.getTime() + job.durationMinutes * 60_000,
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

    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
      throw new BadRequestException('durationMinutes must be a positive integer');
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
        scheduledAt: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: {
          not: JobStatus.CANCELLED,
        },
      },
      select: {
        scheduledAt: true,
        durationMinutes: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const busyIntervals = jobs
      .map((job) => {
        const start = job.scheduledAt;
        const end = new Date(start.getTime() + job.durationMinutes * 60_000);
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

    const requiredGapMs = (input.durationMinutes + travelBufferMinutes) * 60_000;

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

  private getUtcDayAndWorkBounds(dateInput: string): {
    dayStart: Date;
    dayEnd: Date;
    workStart: Date;
    workEnd: Date;
  } {
    // Prefer explicit YYYY-MM-DD so “day” boundaries are predictable.
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(dateInput.trim());
    const base = m ? new Date(`${dateInput}T00:00:00.000Z`) : new Date(dateInput);

    if (Number.isNaN(base.getTime())) {
      throw new BadRequestException('date must be a valid ISO date string');
    }

    const y = base.getUTCFullYear();
    const mo = base.getUTCMonth();
    const d = base.getUTCDate();

    const dayStart = new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, mo, d + 1, 0, 0, 0, 0));

    const workStart = new Date(Date.UTC(y, mo, d, 8, 0, 0, 0));
    const workEnd = new Date(Date.UTC(y, mo, d, 17, 0, 0, 0));

    return { dayStart, dayEnd, workStart, workEnd };
  }

  private getUtcDayBoundsFromDate(date: Date): { dayStart: Date; dayEnd: Date } {
    const y = date.getUTCFullYear();
    const mo = date.getUTCMonth();
    const d = date.getUTCDate();

    const dayStart = new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, mo, d + 1, 0, 0, 0, 0));

    return { dayStart, dayEnd };
  }

  private intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    // Overlap exists if each interval starts before the other ends.
    return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
  }

  private hasOverlapWithIntervals(
    proposedStart: Date,
    proposedEnd: Date,
    existing: Array<{ start: Date; end: Date }>,
  ) {
    for (const interval of existing) {
      if (
        this.intervalsOverlap(
          proposedStart,
          proposedEnd,
          interval.start,
          interval.end,
        )
      ) {
        return true;
      }
    }
    return false;
  }
}
