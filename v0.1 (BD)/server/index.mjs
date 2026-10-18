import { createPool } from './db.mjs';
import { loadConfig } from './config.mjs';
import { createApp } from './app.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { expireOrders } from './store.mjs';
const config=loadConfig();
const pool=createPool(config.databaseUrl);
await migrate(pool);
if(config.demoAccounts) await seed(pool);
await expireOrders(pool);
const app=createApp({pool,config});
const server=app.listen(config.port,'0.0.0.0',()=>console.log(`Kings API: http://localhost:${config.port} | pagamentos: ${config.paymentMode}`));
let expiring=false;
const timer=setInterval(async()=>{
  if(expiring) return;
  expiring=true;
  try {await expireOrders(pool);await pool.query('DELETE FROM sessions WHERE expires_at<now()');}
  catch(error){console.error('Falha na limpeza periódica:',error.message);}
  finally{expiring=false;}
},60000);
async function stop(){clearInterval(timer);server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
