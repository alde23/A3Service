import { EnvSchema } from './env.schema';

export function validate(config: Record<string, string | undefined>) {
    return EnvSchema.parse(config);
}