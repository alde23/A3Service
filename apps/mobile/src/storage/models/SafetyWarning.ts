import { Model } from '@nozbe/watermelondb';
import { text, json, relation } from '@nozbe/watermelondb/decorators';

export default class SafetyWarning extends Model {
  static table = 'safety_warnings';

  @text('model_id') modelId!: string;
  @text('warning_type') warningType!: string | null;
  @text('description') description!: string;
  @json('source_refs', (raw) => raw) sourceRefs!: unknown;
  @text('remote_id') remoteId!: string | null;

  @relation('boiler_models', 'model_id') model!: unknown;
}
