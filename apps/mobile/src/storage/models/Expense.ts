import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';

export default class Expense extends Model {
  static table = 'expenses';

  @field('job_id') jobId!: string | null;
  @field('amount') amount!: number;
  @field('currency') currency!: string | null;
  @text('description') description!: string | null;
  @date('incurred_at') incurredAt!: Date;
  @field('skipped_validation') skippedValidation!: boolean | null;
  @text('remote_id') remoteId!: string | null;
}
