import { Model, Relation } from '@nozbe/watermelondb';
import { field, relation, text } from '@nozbe/watermelondb/decorators';
import ServiceLog from './ServiceLog';

export default class LaborEntry extends Model {
  static table = 'labor_entries';

  static associations = {
    service_logs: { type: 'belongs_to' as const, key: 'service_log_id' },
  };

  @field('service_log_id') serviceLogId!: string;
  @field('hours') hours!: number;
  @field('hourly_rate') hourlyRate!: number;
  @text('description') description!: string | null;
  @text('remote_id') remoteId!: string | null;

  @relation('service_logs', 'service_log_id') serviceLog!: Relation<ServiceLog>;
}
