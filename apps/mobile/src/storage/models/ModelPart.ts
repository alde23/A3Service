import { Model } from '@nozbe/watermelondb';
import { text, relation } from '@nozbe/watermelondb/decorators';

export default class ModelPart extends Model {
  static table = 'model_parts';

  @text('model_id') modelId!: string;
  @text('part_id') partId!: string;

  @relation('boiler_models', 'model_id') model!: unknown;
  @relation('parts', 'part_id') part!: unknown;
}
