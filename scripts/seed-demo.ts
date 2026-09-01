import './lib/env';
import { runSeedDemo } from './lib/run-seed-demo';

runSeedDemo({ force: process.argv.includes('--force') }).catch((err) => {
  console.error(err);
  process.exit(1);
});
