import { Model } from '@nozbe/watermelondb';
import { text, json, relation } from '@nozbe/watermelondb/decorators';

export default class DiagnosticCode extends Model {
  static table = 'diagnostic_codes';

  @text('model_id') modelId!: string;
  @text('code') code!: string;
  @text('description') description!: string | null;
  @text('level') level!: string | null;
  @json('source_refs', (raw) => raw) sourceRefs!: unknown;
  @text('remote_id') remoteId!: string | null;

  @relation('boiler_models', 'model_id') model!: unknown;
}
