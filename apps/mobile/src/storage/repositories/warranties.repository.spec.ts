import { database } from '../index';
import {
  createWarranty,
  localValidateCommissioning,
  getWarrantyForJob,
} from './warranties.repository';
import SyncQueueItem from '../models/SyncQueueItem';

describe('warranties.repository', () => {
  beforeEach(async () => {
    // Clear SQLite tables
    await database.write(async () => {
      await database.get('sync_queue').query().destroyAllPermanently();
      await database.get('warranties').query().destroyAllPermanently();
      await database.get('technical_properties').query().destroyAllPermanently();
      await database.get('reference_tables').query().destroyAllPermanently();
    });
  });

  it('runs offline commissioning validation rules matching NestJS guidelines', async () => {
    // A. Seed local references
    let propTemp!: any;
    let propPres!: any;

    await database.write(async () => {
      propTemp = await database.get('technical_properties').create((p: any) => {
        p.code = 'TEMP';
        p.label = 'Flow Temperature';
        p.unit = 'C';
      });

      propPres = await database.get('technical_properties').create((p: any) => {
        p.code = 'PRES';
        p.label = 'Water Pressure';
        p.unit = 'bar';
      });

      // Seeding validation rules: Flow Temp range [30, 90], Pressure range [1.0, 2.5] (required)
      await database.get('reference_tables').create((r: any) => {
        r.boilerModelId = 'model-eco';
        r.propertyId = propTemp.id;
        r.minValue = 30;
        r.maxValue = 90;
        r.required = false;
      });

      await database.get('reference_tables').create((r: any) => {
        r.boilerModelId = 'model-eco';
        r.propertyId = propPres.id;
        r.minValue = 1.0;
        r.maxValue = 2.5;
        r.required = true;
      });
    });

    // B. Test Out-of-Range validation
    const check1 = await localValidateCommissioning('model-eco', [
      { code: 'TEMP', value: 95 }, // Out of range!
      { code: 'PRES', value: 1.5 },
    ]);
    expect(check1.valid).toBe(false);
    expect(check1.issues.find(i => i.code === 'TEMP')?.status).toBe('OUT_OF_RANGE');

    // C. Test Missing Required validation
    const check2 = await localValidateCommissioning('model-eco', [
      { code: 'TEMP', value: 50 },
    ]);
    expect(check2.valid).toBe(false);
    expect(check2.missingRequired).toContain('PRES');

    // D. Test Valid commissioning
    const check3 = await localValidateCommissioning('model-eco', [
      { code: 'TEMP', value: 50 },
      { code: 'PRES', value: 1.8 },
    ]);
    expect(check3.valid).toBe(true);
    expect(check3.issues.every(i => i.status === 'OK')).toBe(true);
  });

  it('submits warranty locally and enqueues sync insertion', async () => {
    const warranty = await createWarranty('model-eco', 'job-123', 24, 'Extended warranty', [
      { code: 'PRES', value: 1.8 },
    ]);

    expect(warranty.durationMonths).toBe(24);
    expect(warranty.status).toBe('ACTIVE');

    const found = await getWarrantyForJob('job-123');
    expect(found?.id).toBe(warranty.id);

    const pending = await database.get<SyncQueueItem>('sync_queue').query().fetch();
    expect(pending.length).toBe(1);
    expect(pending[0].operation).toBe('INSERT');
  });
});
