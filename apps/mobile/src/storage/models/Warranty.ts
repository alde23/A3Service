import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';

export default class Warranty extends Model {
  static table = 'warranties';

  @field('boiler_model_id') boilerModelId!: string;
  @field('job_id') jobId!: string | null;
  @date('start_date') startDate!: Date;
  @field('duration_months') durationMonths!: number;
  @date('expires_at') expiresAt!: Date | null;
  @field('status') status!: string;
  @text('notes') notes!: string | null;
  @text('remote_id') remoteId!: string | null;
}
