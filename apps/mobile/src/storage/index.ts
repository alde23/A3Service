import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import Job from './models/Job';
import SyncQueueItem from './models/SyncQueueItem';
import SyncLog from './models/SyncLog';
import AppPreference from './models/AppPreference';

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
      modelClasses: [Job, SyncQueueItem, SyncLog, AppPreference],
    });
  }
  return _database;
}

export const database = new Proxy({} as Database, {
  get(_target, prop) {
    return (getDatabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});