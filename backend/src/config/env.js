import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // PostgreSQL Config
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().default('localhost'),
  PGPORT: z.string().default('5432').transform(Number),
  PGDATABASE: z.string().default('syncspace_db'),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default('postgres'),
  PG_MAX_POOL_SIZE: z.string().default('50').transform(Number),
  PG_IDLE_TIMEOUT_MS: z.string().default('30000').transform(Number),
  PG_CONNECTION_TIMEOUT_MS: z.string().default('5000').transform(Number),

  // Redis Config
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.string().default('0').transform(Number),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('1000').transform(Number),

  // Auth / JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('syncspace-super-secret-jwt-key-change-in-prod'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().default('10').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
