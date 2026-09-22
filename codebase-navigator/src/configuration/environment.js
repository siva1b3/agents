import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SESSION_LIFETIME_SECONDS: z.coerce.number().int().min(1).max(86400).default(3600),
  REQUEST_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(120),
  AUTHENTICATION_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(10),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  SEED_DEMO_DATA: z.enum(['true', 'false']).default('false'),
});

export function readConfiguration(environment = process.env) {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    // Field names are useful at startup; raw environment values may be secrets.
    throw new Error('Invalid environment configuration: ' +
      result.error.issues.map(issue => issue.path.join('.')).join(', '));
  }
  const values = result.data;
  if (values.NODE_ENV === 'production' && values.SEED_DEMO_DATA === 'true') {
    throw new Error('Demo accounts cannot be enabled in production mode');
  }
  return Object.freeze({
    environment: values.NODE_ENV,
    port: values.PORT,
    bodySizeLimit: '16kb',
    sessionLifetimeMilliseconds: values.SESSION_LIFETIME_SECONDS * 1000,
    requestLimitPerMinute: values.REQUEST_LIMIT_PER_MINUTE,
    authenticationLimitPerMinute: values.AUTHENTICATION_LIMIT_PER_MINUTE,
    allowedOrigins: values.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean),
    seedDemoData: values.SEED_DEMO_DATA === 'true',
    idempotencyLifetimeMilliseconds: 24 * 60 * 60 * 1000,
    maximumIdempotencyRecords: 10000,
    maximumAuditEvents: 1000,
    shutdownTimeoutMilliseconds: 10000,
  });
}
