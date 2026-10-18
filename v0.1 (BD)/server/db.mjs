import pg from 'pg';
export function createPool(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error('Defina DATABASE_URL no .env. Consulte o README.');
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10, connectionTimeoutMillis: 5000 });
  pool.on('error', error => console.error('Conexão PostgreSQL interrompida:', error.message));
  return pool;
}
export async function transaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    const value = await fn(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
