import { JobPriority, JobStatus } from '../../../generated/prisma/client';

export class CreateJobDto {
  /** UUID of the site this job is for */
  siteId!: string;

  technicianId!: string;
  managerId?: string;

  /** ISO string (recommended: YYYY-MM-DDTHH:mm:ssZ) */
  scheduledDate!: string;

  estimatedDuration?: number;

  status?: JobStatus;
  priority?: JobPriority;
  notes?: string;

  /** Denormalised address snapshot (optional, falls back to site.rawAddress) */
  rawAddress?: string;
}
