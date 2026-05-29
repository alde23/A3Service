import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import Job from './models/Job';
import SyncQueueItem from './models/SyncQueueItem';
import SyncLog from './models/SyncLog';
import AppPreference from './models/AppPreference';
import BoilerModel from './models/BoilerModel';
import Part from './models/Part';
import FaultCode from './models/FaultCode';
import Warranty from './models/Warranty';
import TechnicalProperty from './models/TechnicalProperty';
import ReferenceTable from './models/ReferenceTable';
import ServiceLog from './models/ServiceLog';
import LaborEntry from './models/LaborEntry';
import ConsumedPart from './models/ConsumedPart';
import SyncConflict from './models/SyncConflict';

let _database: Database | null = null;

export function getDatabase(): Database {
  if (!_database) {
    const adapter = new SQLiteAdapter({
      schema,
      migrations,
      jsi: false,
      onSetUpError: (error) => {
        console.error('[WatermelonDB] setup error:', error);
      },
    });

    _database = new Database({
      adapter,
      modelClasses: [
        Job,
        SyncQueueItem,
        SyncLog,
        AppPreference,
        BoilerModel,
        Part,
        FaultCode,
        Warranty,
        TechnicalProperty,
        ReferenceTable,
        ServiceLog,
        LaborEntry,
        ConsumedPart,
        SyncConflict,
      ],
    });
  }
  return _database;
}

export const database = new Proxy({} as Database, {
  get(_target, prop) {
    return (getDatabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});