import { Model } from '@nozbe/watermelondb';
import { text, json, field, relation } from '@nozbe/watermelondb/decorators';

export default class FaultCode extends Model {
  static table = 'fault_codes';

  @text('code') code!: string;
  @text('title') title!: string;
  @text('description') description!: string | null;
  @text('severity') severity!: string | null;
  @text('model_id') modelId!: string;
  @json('possible_causes', (raw) => raw) possibleCauses!: unknown;
  @json('manufacturer_steps', (raw) => raw) manufacturerSteps!: unknown;
  @json('cautions_or_notes', (raw) => raw) cautionsOrNotes!: unknown;
  @json('symptoms', (raw) => raw) symptoms!: unknown;
  @json('related_components', (raw) => raw) relatedComponents!: unknown;
  @text('safety_level') safetyLevel!: string | null;
  @json('search_tags', (raw) => raw) searchTags!: unknown;
  @json('source_refs', (raw) => raw) sourceRefs!: unknown;
  @field('confidence') confidence!: number | null;
  @field('review_required') reviewRequired!: boolean | null;
  @text('remote_id') remoteId!: string | null;

  @relation('boiler_models', 'model_id') model!: unknown;
}
