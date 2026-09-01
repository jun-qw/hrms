import './lib/env';
import { runMigrations } from './lib/run-migrations';

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
