import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import Job from './models/Job';
import SyncQueueItem from './models/SyncQueueItem';
import SyncLog from './models/SyncLog';
import AppPreference from './models/AppPreference';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  onSetUpError: (error) => {
    console.error('[WatermelonDB] setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Job, SyncQueueItem, SyncLog, AppPreference],
});