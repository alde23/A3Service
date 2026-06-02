import { Model } from '@nozbe/watermelondb';
import { field, text, json } from '@nozbe/watermelondb/decorators';

export default class Part extends Model {
  static table = 'parts';

  @text('sku') sku!: string;
  @text('name') name!: string;
  @text('brand') brand!: string | null;
  @field('unit_price') unitPrice!: number | null;
  @text('inventory_status') inventoryStatus!: string | null;
  @json('aliases', (raw) => raw) aliases!: unknown;
  @text('remote_id') remoteId!: string | null;
}
