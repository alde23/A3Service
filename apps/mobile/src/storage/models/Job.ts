import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export default class Job extends Model {
  static table = 'jobs';

  @text('title') title!: string;
  @date('scheduled_at') scheduledAt!: Date;
  @field('duration_minutes') durationMinutes!: number;
  @field('status') status!: string;
  @text('notes') notes!: string | null;
  @field('latitude') latitude!: number | null;
  @field('longitude') longitude!: number | null;
  @field('technician_id') technicianId!: string;
  @field('client_id') clientId!: string;
  @field('remote_id') remoteId!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
