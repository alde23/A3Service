import {
  searchLocalBoilerModels,
  searchLocalParts,
  searchLocalFaultCodes,
  getReferenceTableForModel,
  upsertCatalogFromServer,
} from './catalog.repository';
import { database } from '../index';
import BoilerModel from '../models/BoilerModel';

describe('catalog.repository', () => {
  beforeEach(async () => {
    await database.write(async () => {
      await database.get('boiler_models').query().destroyAllPermanently();
      await database.get('parts').query().destroyAllPermanently();
      await database.get('fault_codes').query().destroyAllPermanently();
      await database.get('technical_properties').query().destroyAllPermanently();
      await database.get('reference_tables').query().destroyAllPermanently();
    });
  });

  it('upserts boiler models and searches them', async () => {
    await upsertCatalogFromServer('boiler_models', [
      { id: 'rm1', modelName: 'TestModel1', series: 'SeriesA' },
      { id: 'rm2', modelName: 'TestModel2', series: 'SeriesB' },
    ]);

    const resultsEmpty = await searchLocalBoilerModels('');
    expect(resultsEmpty.length).toBe(2);

    const results = await searchLocalBoilerModels('TestModel1');
    expect(results.length).toBe(1);
    expect(results[0].modelName).toBe('TestModel1');
  });

  it('upserts parts and searches them', async () => {
    await upsertCatalogFromServer('parts', [
      { id: 'p1', sku: 'SKU1', name: 'PartA', brand: 'BrandA', unitPrice: 10 },
      { id: 'p2', sku: 'SKU2', name: 'PartB', brand: 'BrandB', unitPrice: '20' },
    ]);

    const resultsEmpty = await searchLocalParts('');
    expect(resultsEmpty.length).toBe(2);

    const results = await searchLocalParts('PartA');
    expect(results.length).toBe(1);
    expect(results[0].sku).toBe('SKU1');
    
    // Update existing
    await upsertCatalogFromServer('parts', [
      { id: 'p1', sku: 'SKU1', name: 'PartA_Updated', brand: 'BrandA', unitPrice: 15 },
    ]);
    const resultsUpdate = await searchLocalParts('PartA');
    expect(resultsUpdate.length).toBe(1);
    expect(resultsUpdate[0].name).toBe('PartA_Updated');
  });

  it('upserts fault codes and searches them', async () => {
    await upsertCatalogFromServer('fault_codes', [
      { id: 'fc1', code: 'F1', title: 'Fault 1' },
    ]);

    const resultsEmpty = await searchLocalFaultCodes('');
    expect(resultsEmpty.length).toBe(1);

    const results = await searchLocalFaultCodes('F1');
    expect(results.length).toBe(1);
    expect(results[0].code).toBe('F1');
  });

  it('upserts technical properties and reference tables', async () => {
    await upsertCatalogFromServer('technical_properties', [
      { id: 'prop1', code: 'P1', label: 'Prop 1' },
    ]);
    await upsertCatalogFromServer('reference_tables', [
      { id: 'ref1', boilerModelId: 'bm1', propertyId: 'prop1', minValue: 10, maxValue: '20', required: true },
    ]);

    // get properties
    const collection = database.get('technical_properties');
    const props = await collection.query().fetch();
    expect(props.length).toBe(1);
    
    // wait, we need local prop1 id
    const localPropId = props[0].id;
    
    // update ref to use local prop id
    await database.write(async () => {
        const refs = await database.get('reference_tables').query().fetch();
        await (refs[0] as any).update((record: any) => {
            record.propertyId = localPropId;
            record.boilerModelId = 'local-bm1';
        });
    });

    const results = await getReferenceTableForModel('local-bm1');
    expect(results.length).toBe(1);
    expect(results[0].code).toBe('P1');
  });
});
