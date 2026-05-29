import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';

export default class SyncConflict extends Model {
  static table = 'sync_conflicts';

  @field('affected_entity') affectedEntity!: string;
  @field('affected_id') affectedId!: string;
  @text('policy') policy!: string | null;
  @field('status') status!: string;
  @text('details') details!: string | null;
  @text('resolution_notes') resolutionNotes!: string | null;
  @date('resolved_at') resolvedAt!: Date | null;
}
