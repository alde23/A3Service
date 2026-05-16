import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class JobManagerService {
  buildAgenda() {
    // TODO(scheduling): implement agenda aggregation logic.
    throw new NotImplementedException('Job manager agenda is not implemented yet');
  }

  reorderJobs() {
    // TODO(scheduling): implement reorder logic.
    throw new NotImplementedException('Job reorder is not implemented yet');
  }
}
