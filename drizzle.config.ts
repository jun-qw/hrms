import './scripts/lib/env';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://hrms:hrms@localhost:5432/hrms',
  },
  verbose: true,
  strict: true,
});
