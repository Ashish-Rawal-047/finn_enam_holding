/** Usage: npm run jobs:run -- market|announcements|event-intelligence */
import { pool } from '../db/client.js';
import { JOBS, runJob, type JobName } from './index.js';

const name = process.argv[2] as JobName;
if (!name || !(name in JOBS)) {
  console.error(`Usage: npm run jobs:run -- <${Object.keys(JOBS).join('|')}>`);
  process.exit(2);
}

runJob(name)
  .then((stats) => console.log(`[jobs] ${name}:`, JSON.stringify(stats)))
  .catch((err) => {
    console.error(`[jobs] ${name} failed:`, err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
