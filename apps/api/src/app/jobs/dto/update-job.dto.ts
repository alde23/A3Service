import { JobStatus } from '@prisma/client';

export class UpdateJobDto {
  title?: string;

  /** ISO string (recommended) or any Date-parsable string */
  scheduledAt?: string;

  durationMinutes?: number;

  status?: JobStatus;
  notes?: string;
  latitude?: number;
  longitude?: number;

  technicianId?: string;
  clientId?: string;
}
