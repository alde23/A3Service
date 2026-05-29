import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class AppPreference extends Model {
  static table = 'app_preferences';

  @field('key') key!: string;
  @text('value') value!: string;
}