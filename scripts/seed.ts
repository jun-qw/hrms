import './lib/env';
import { runSeed } from './lib/run-seed';

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
