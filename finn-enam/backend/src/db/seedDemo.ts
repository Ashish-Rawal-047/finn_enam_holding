/**
 * Creates or updates only the reviewer demo account (idempotent). Safe to run on every deploy:
 *   npm run demo:seed
 * Needs DEMO_MODE_ENABLED=true, DEMO_USER_EMAIL and DEMO_USER_PASSWORD. The demo universe itself
 * comes from `npm run db:seed`.
 */
import { pool } from './client.js';
import { ensureDemoAccount } from '../services/demo.js';

ensureDemoAccount()
  .then(async (result) => {
    console.log('[demo] reviewer demo account:', result);
    await pool.end();
  })
  .catch(async (err) => {
    console.error('[demo] failed:', (err as Error).message);
    await pool.end();
    process.exit(1);
  });
