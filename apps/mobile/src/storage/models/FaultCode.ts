import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

export default class FaultCode extends Model {
  static table = 'fault_codes';

  @text('code') code!: string;
  @text('title') title!: string;
  @text('description') description!: string | null;
  @text('severity') severity!: string | null;
  @text('remote_id') remoteId!: string | null;
}
