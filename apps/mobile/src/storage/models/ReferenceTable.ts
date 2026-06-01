import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class ReferenceTable extends Model {
  static table = 'reference_tables';

  @field('boiler_model_id') boilerModelId!: string;
  @field('property_id') propertyId!: string;
  @field('min_value') minValue!: number | null;
  @field('max_value') maxValue!: number | null;
  @field('required') required!: boolean;
  @text('remote_id') remoteId!: string | null;
}
