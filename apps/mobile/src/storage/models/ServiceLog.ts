import { Model, Query } from '@nozbe/watermelondb';
import { children, date, field, text } from '@nozbe/watermelondb/decorators';
import LaborEntry from './LaborEntry';
import ConsumedPart from './ConsumedPart';

export default class ServiceLog extends Model {
  static table = 'service_logs';

  static associations = {
    labor_entries: { type: 'has_many' as const, foreignKey: 'service_log_id' },
    consumed_parts: { type: 'has_many' as const, foreignKey: 'service_log_id' },
  };

  @field('job_id') jobId!: string;
  @field('status') status!: string;
  @text('summary') summary!: string | null;
  @text('notes') notes!: string | null;
  @date('synced_at') syncedAt!: Date | null;
  @text('remote_id') remoteId!: string | null;

  @children('labor_entries') laborEntries!: Query<LaborEntry>;
  @children('consumed_parts') consumedParts!: Query<ConsumedPart>;
}
