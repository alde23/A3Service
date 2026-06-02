import { Model } from '@nozbe/watermelondb';
import { text, json, relation } from '@nozbe/watermelondb/decorators';

export default class StatusCode extends Model {
  static table = 'status_codes';

  @text('model_id') modelId!: string;
  @text('code') code!: string;
  @text('description') description!: string | null;
  @text('meaning') meaning!: string | null;
  @json('source_refs', (raw) => raw) sourceRefs!: unknown;
  @text('remote_id') remoteId!: string | null;

  @relation('boiler_models', 'model_id') model!: unknown;
}
