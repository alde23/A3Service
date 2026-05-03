import { z } from 'zod';

/**
 * EnvSchema validates all required environment variables at app startup.
 * Used exclusively by the NestJS API — never shared with the mobile client.
 */
export const EnvSchema = z.object({
  DATABASE_URL:               z.url("Invalid database URL"),
  DIRECT_URL:                 z.url("Invalid direct URL"),
  SUPABASE_SERVICE_ROLE_KEY:  z.string().min(1, "Supabase service role key is required"),
  SUPABASE_ANON_KEY:          z.string().min(1, "Supabase anon key is required"),
  JWT_SECRET:                 z.string().min(32, "JWT secret must be at least 32 characters"),
  PORT:                       z.coerce.number().default(3000),
  NODE_ENV:                   z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof EnvSchema>;