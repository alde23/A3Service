import { Model } from '@nozbe/watermelondb';
import { field, text, json, children } from '@nozbe/watermelondb/decorators';

export default class BoilerModel extends Model {
  static table = 'boiler_models';

  @text('manufacturer_id') manufacturerId!: string | null;
  @text('model_name') modelName!: string;
  @text('series') series!: string | null;
  @text('fuel_type') fuelType!: string | null;
  @field('production_start_year') productionStartYear!: number | null;
  @field('production_end_year') productionEndYear!: number | null;
  @text('document_type') documentType!: string | null;
  @text('language') language!: string | null;
  @json('search_terms', (raw) => raw) searchTerms!: unknown;
  @json('derived_guidance', (raw) => raw) derivedGuidance!: unknown;
  @text('remote_id') remoteId!: string | null;

  @children('fault_codes') faultCodes!: unknown;
  @children('technical_specs') technicalSpecs!: unknown;
  @children('status_codes') statusCodes!: unknown;
  @children('diagnostic_codes') diagnosticCodes!: unknown;
  @children('safety_warnings') safetyWarnings!: unknown;
  @children('maintenance_tasks') maintenanceTasks!: unknown;
}
