import { JobStatus } from '../../../generated/prisma/client';

export class UpdateJobStatusDto {
  status!: JobStatus;
}
