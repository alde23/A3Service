import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'jobs',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'scheduled_at', type: 'number' },
        { name: 'duration_minutes', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'technician_id', type: 'string', isIndexed: true },
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'table_name', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'operation', type: 'string' },
        { name: 'payload', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'retries', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_logs',
      columns: [
        { name: 'synced_at', type: 'number' },
        { name: 'pushed', type: 'number' },
        { name: 'pulled', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'error', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'app_preferences',
      columns: [
        { name: 'key', type: 'string' },
        { name: 'value', type: 'string' },
      ],
    }),
    tableSchema({
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
    tableSchema({
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
    tableSchema({
      name: 'fault_codes',
      columns: [
        { name: 'code', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'severity', type: 'string', isOptional: true },
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
      ],
    }),
    tableSchema({
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
    tableSchema({
      name: 'technical_properties',
      columns: [
        { name: 'code', type: 'string' },
        { name: 'label', type: 'string' },
        { name: 'unit', type: 'string', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
      ],
    }),
    tableSchema({
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
    tableSchema({
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
    tableSchema({
      name: 'labor_entries',
      columns: [
        { name: 'service_log_id', type: 'string', isIndexed: true },
        { name: 'hours', type: 'number' },
        { name: 'hourly_rate', type: 'number' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
      ],
    }),
    tableSchema({
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
    tableSchema({
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
});
