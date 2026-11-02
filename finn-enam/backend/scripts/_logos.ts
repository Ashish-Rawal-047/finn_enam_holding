import { pool } from '../src/db/client.js';
if (process.argv[2] === 'clear') await pool.query(`delete from company_logos`);
console.table((await pool.query(`select symbol, status, source, width, height, length(image) bytes, domain from company_logos order by symbol`)).rows);
await pool.end();
