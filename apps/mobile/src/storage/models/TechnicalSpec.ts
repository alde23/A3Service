import { Model } from '@nozbe/watermelondb';
import { text, field, json, relation } from '@nozbe/watermelondb/decorators';

export default class TechnicalSpec extends Model {
  static table = 'technical_specs';

  @text('model_id') modelId!: string;
  @text('parameter') parameter!: string;
  @text('value') value!: string;
  @text('unit') unit!: string | null;
  @json('applies_to_models', (raw) => raw) appliesToModels!: unknown;
  @text('category') category!: string | null;
  @json('source_refs', (raw) => raw) sourceRefs!: unknown;
  @field('confidence') confidence!: number | null;
  @field('review_required') reviewRequired!: boolean | null;
  @text('remote_id') remoteId!: string | null;

  @relation('boiler_models', 'model_id') model!: unknown;
}
