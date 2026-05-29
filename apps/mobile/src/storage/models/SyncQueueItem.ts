import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export default class SyncQueueItem extends Model {
  static table = 'sync_queue';

  @field('table_name') tableName!: string;
  @field('record_id') recordId!: string;
  @field('operation') operation!: SyncOperation;
  @text('payload') payload!: string;
  @field('status') status!: SyncStatus;
  @field('retries') retries!: number;
  @date('created_at') createdAt!: Date;
}