import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const digest = token => createHash('sha256').update(token).digest('hex');
export const randomToken = () => randomBytes(32).toString('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [algorithm, salt, hex] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !hex) return false;
  const hash = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}
export const publicUser = row => ({
  id: row.id, name: row.name, email: row.email, role: row.role,
  phone: row.phone, cpf: row.cpf || undefined, sector: row.sector || undefined,
});
export async function createSession(db, userId, config) {
  const token = randomToken();
  const csrfToken = randomToken();
  await db.query(`INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at)
    VALUES($1,$2,$3,now()+($4::text||' days')::interval)`, [digest(token), userId, csrfToken, config.sessionDays]);
  return { token, csrfToken };
}
export function sessionCookie(res, token, config) {
  res.cookie('kings_session', token, { httpOnly: true, secure: config.cookieSecure,
    sameSite: 'lax', path: '/', maxAge: config.sessionDays * 86400000 });
}
