import {
  addColumns,
  createTable,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'boiler_models',
          columns: [
            { name: 'manufacturer_id', type: 'string', isOptional: true },
            { name: 'model_name', type: 'string' },
            { name: 'series', type: 'string', isOptional: true },
            { name: 'fuel_type', type: 'string', isOptional: true },
            { name: 'production_start_year', type: 'number', isOptional: true },
            { name: 'production_end_year', type: 'number', isOptional: true },
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'parts',
          columns: [
            { name: 'sku', type: 'string' },
            { name: 'name', type: 'string' },
            { name: 'brand', type: 'string', isOptional: true },
            { name: 'unit_price', type: 'number', isOptional: true },
            { name: 'inventory_status', type: 'string', isOptional: true },
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'fault_codes',
          columns: [
            { name: 'code', type: 'string' },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'severity', type: 'string', isOptional: true },
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'warranties',
          columns: [
            { name: 'boiler_model_id', type: 'string', isIndexed: true },
            { name: 'job_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'start_date', type: 'number' },
            { name: 'duration_months', type: 'number' },
            { name: 'expires_at', type: 'number', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'technical_properties',
          columns: [
            { name: 'code', type: 'string' },
            { name: 'label', type: 'string' },
            { name: 'unit', type: 'string', isOptional: true },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'reference_tables',
          columns: [
            { name: 'boiler_model_id', type: 'string', isIndexed: true },
            { name: 'property_id', type: 'string', isIndexed: true },
            { name: 'min_value', type: 'number', isOptional: true },
            { name: 'max_value', type: 'number', isOptional: true },
            { name: 'required', type: 'boolean' },
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'service_logs',
          columns: [
            { name: 'job_id', type: 'string', isIndexed: true },
            { name: 'status', type: 'string' },
            { name: 'summary', type: 'string', isOptional: true },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'synced_at', type: 'number', isOptional: true },
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'labor_entries',
          columns: [
            { name: 'service_log_id', type: 'string', isIndexed: true },
            { name: 'hours', type: 'number' },
            { name: 'hourly_rate', type: 'number' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'consumed_parts',
          columns: [
            { name: 'service_log_id', type: 'string', isIndexed: true },
            { name: 'part_id', type: 'string', isIndexed: true },
            { name: 'quantity', type: 'number' },
            { name: 'unit_price', type: 'number', isOptional: true },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'sync_conflicts',
          columns: [
            { name: 'affected_entity', type: 'string' },
            { name: 'affected_id', type: 'string' },
            { name: 'policy', type: 'string', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'details', type: 'string', isOptional: true },
            { name: 'resolution_notes', type: 'string', isOptional: true },
            { name: 'resolved_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'jobs',
          columns: [
            {
              name: 'remote_id',
              type: 'string',
              isOptional: true,
              isIndexed: true,
            },
          ],
        }),
      ],
    },
  ],
});
