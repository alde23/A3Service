import { JobPriority, JobStatus } from '../../../generated/prisma/client';
 
export class UpdateJobDto {
  siteId?: string;
 
  technicianId?: string;
  managerId?: string;
 
  /** ISO string (recommended: YYYY-MM-DDTHH:mm:ssZ) */
  scheduledDate?: string;
 
  estimatedDuration?: number;
 
  status?: JobStatus;
  priority?: JobPriority;
  notes?: string;
  rawAddress?: string;
}
 