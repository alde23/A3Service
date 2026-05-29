import { Model, Relation } from '@nozbe/watermelondb';
import { field, relation, text } from '@nozbe/watermelondb/decorators';
import ServiceLog from './ServiceLog';

export default class ConsumedPart extends Model {
  static table = 'consumed_parts';

  static associations = {
    service_logs: { type: 'belongs_to' as const, key: 'service_log_id' },
  };

  @field('service_log_id') serviceLogId!: string;
  @field('part_id') partId!: string;
  @field('quantity') quantity!: number;
  @field('unit_price') unitPrice!: number | null;
  @text('notes') notes!: string | null;
  @text('remote_id') remoteId!: string | null;

  @relation('service_logs', 'service_log_id') serviceLog!: Relation<ServiceLog>;
}
