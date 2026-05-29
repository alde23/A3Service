import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export default class SyncLog extends Model {
  static table = 'sync_logs';

  @readonly @date('synced_at') syncedAt!: Date;
  @field('pushed') pushed!: number;
  @field('pulled') pulled!: number;
  @field('status') status!: string;
  @text('error') error!: string | null;
}