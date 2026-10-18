export function loadConfig(env = process.env) {
  const port = Number(env.API_PORT || 3001);
  const paymentMode = env.PAYMENT_MODE || 'disabled';
  if (!['mock', 'disabled'].includes(paymentMode)) throw new Error('PAYMENT_MODE deve ser mock ou disabled.');
  return {
    port,
    databaseUrl: env.DATABASE_URL,
    origin: env.APP_ORIGIN || 'http://localhost:5173',
    cookieSecure: env.COOKIE_SECURE === 'true',
    demoAccounts: env.SEED_DEMO === 'true',
    paymentMode,
    sessionDays: 7,
    reservationMinutes: 30,
    production: env.NODE_ENV === 'production',
  };
}
