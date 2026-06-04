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
import Expense from './models/Expense';
import ServiceLog from './models/ServiceLog';
import LaborEntry from './models/LaborEntry';
import ConsumedPart from './models/ConsumedPart';
import SyncConflict from './models/SyncConflict';
import TechnicalSpec from './models/TechnicalSpec';
import StatusCode from './models/StatusCode';
import DiagnosticCode from './models/DiagnosticCode';
import SafetyWarning from './models/SafetyWarning';
import MaintenanceTask from './models/MaintenanceTask';
import ModelPart from './models/ModelPart';

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
        Expense,
        ServiceLog,
        LaborEntry,
        ConsumedPart,
        SyncConflict,
        TechnicalSpec,
        StatusCode,
        DiagnosticCode,
        SafetyWarning,
        MaintenanceTask,
        ModelPart,
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