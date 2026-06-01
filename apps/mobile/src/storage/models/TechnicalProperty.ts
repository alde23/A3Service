import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

export default class TechnicalProperty extends Model {
  static table = 'technical_properties';

  @text('code') code!: string;
  @text('label') label!: string;
  @text('unit') unit!: string | null;
  @text('description') description!: string | null;
  @text('remote_id') remoteId!: string | null;
}
