import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

export default class MockSQLiteAdapter extends LokiJSAdapter {
  constructor(config: any) {
    super({
      schema: config.schema,
      migrations: config.migrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
    });
  }
}
