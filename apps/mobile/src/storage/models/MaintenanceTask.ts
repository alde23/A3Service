import { Model } from '@nozbe/watermelondb';
import { text, json, relation } from '@nozbe/watermelondb/decorators';

export default class MaintenanceTask extends Model {
  static table = 'maintenance_tasks';

  @text('model_id') modelId!: string;
  @text('task') task!: string;
  @text('interval') interval!: string | null;
  @json('steps', (raw) => raw) steps!: unknown;
  @json('source_refs', (raw) => raw) sourceRefs!: unknown;
  @text('remote_id') remoteId!: string | null;

  @relation('boiler_models', 'model_id') model!: unknown;
}
