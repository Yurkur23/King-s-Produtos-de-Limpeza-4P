import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createPool, transaction } from './db.mjs';
export async function migrate(pool) {
  const directory = new URL('../database/migrations/', import.meta.url);
  const files = (await readdir(directory)).filter(f => f.endsWith('.sql')).sort();
  await transaction(pool, async db => {
    await db.query('SELECT pg_advisory_xact_lock(74120)');
    await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = (await db.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name])).rows[0];
      if (existing && existing.checksum !== checksum) throw new Error(`Migração alterada: ${name}. Crie uma nova migração.`);
      if (existing) continue;
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [name, checksum]);
      console.log(`Migração aplicada: ${name}`);
    }
  });
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const pool = createPool();
  try { await migrate(pool); } finally { await pool.end(); }
}
