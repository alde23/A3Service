import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class BoilerModel extends Model {
  static table = 'boiler_models';

  @text('manufacturer_id') manufacturerId!: string | null;
  @text('model_name') modelName!: string;
  @text('series') series!: string | null;
  @text('fuel_type') fuelType!: string | null;
  @field('production_start_year') productionStartYear!: number | null;
  @field('production_end_year') productionEndYear!: number | null;
  @text('remote_id') remoteId!: string | null;
}
