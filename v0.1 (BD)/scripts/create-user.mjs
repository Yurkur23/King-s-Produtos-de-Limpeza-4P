import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {createPool} from '../server/db.mjs';
import {hashPassword} from '../server/security.mjs';
const args=process.argv.slice(2);
const get=name=>{const i=args.indexOf(`--${name}`);return i>=0?args[i+1]:undefined;};
const data=z.object({name:z.string().trim().min(2).max(120),email:z.string().trim().toLowerCase().email().max(254),role:z.enum(['admin','funcionario','cliente'])})
  .safeParse({name:get('name'),email:get('email'),role:get('role') || 'admin'});
if(!data.success){
  console.error('Uso: npm run user:create -- --name "Nome Completo" --email "conta@example.com" --role admin');
  process.exit(1);
}
const password=randomBytes(15).toString('base64url');
const pool=createPool();
try{
  const hash=await hashPassword(password);
  await pool.query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)',[data.data.name,data.data.email,hash,data.data.role]);
  console.log(`Conta criada: ${data.data.email}\nSenha inicial: ${password}\nGuarde esta senha; o banco armazena somente o hash.`);
}catch(error){
  console.error(error.code==='23505'?'Este e-mail já está cadastrado.':error.message);process.exitCode=1;
}finally{await pool.end();}
