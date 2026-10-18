import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transaction } from './db.mjs';
import { digest, hashPassword, verifyPassword, publicUser, createSession, sessionCookie } from './security.mjs';
import { HttpError,fail,productDto,productSelect,cartDto,readOrders,receiveStock,createOrder,confirmPayment,cancelOrder,updateStatus,salesReport } from './store.mjs';
const emailSchema=z.string().trim().toLowerCase().email().max(254);
const registration=z.object({name:z.string().trim().min(2).max(120),email:emailSchema,
  phone:z.string().trim().max(30).default(''),password:z.string().min(6).max(128)}).strict();
const credentials=z.object({email:emailSchema,password:z.string().min(1).max(128)}).strict();
const positiveId=z.coerce.number().int().positive().max(2147483647);
const quantity=z.number().int().min(1).max(999);
const imageSchema=z.string().max(2048).refine(s=>s.startsWith('/products/') || s.startsWith('/icons/') || /^https:\/\/[^\s]+$/i.test(s),'Use um caminho /products/, /icons/ ou uma URL HTTPS.');
const productSchema=z.object({
  brand:z.string().trim().min(1).max(100),name:z.string().trim().min(2).max(150),
  description:z.string().max(5000).default(''),specs:z.array(z.string().max(240)).max(20).default([]),
  volume:z.string().max(60).default(''),price:z.number().min(0.01).max(1000000).refine(p=>Math.abs(p*100-Math.round(p*100))<0.000001,'Use no máximo duas casas decimais.'),
  category:z.enum(['Limpeza Geral','Limpeza Automotiva','Equipamentos']),
  minStock:z.number().int().min(0).max(1000000).default(5),barcode:z.string().trim().max(64).default(''),
  image:imageSchema.default('/icons/icon-192.png'),active:z.boolean().default(true),
});
const addressSchema=z.object({
  name:z.string().trim().min(2).max(120),email:emailSchema,phone:z.string().trim().min(8).max(30),
  cep:z.string().regex(/^\d{5}-?\d{3}$/,'CEP inválido.'),street:z.string().trim().min(2).max(180),
  number:z.string().trim().min(1).max(20),complement:z.string().trim().max(120).default(''),
  city:z.string().trim().min(2).max(120),state:z.string().regex(/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/,'UF inválida.'),
}).strict();
const paymentSchema=z.enum(['Pix','Cartão']);
const checkoutSchema=z.object({payment:paymentSchema,address:addressSchema}).strict();
const saleSchema=z.object({payment:paymentSchema,items:z.array(z.object({productId:positiveId,quantity}).strict()).min(1).max(100)
  .refine(items=>new Set(items.map(i=>i.productId)).size===items.length,'Envie cada produto apenas uma vez.')}).strict();
const validDate=z.iso.date();
const codeParam=z.string().regex(/^(KNG|PDV)-[A-F0-9]{16}$/);
export function createApp({pool,config}) {
  const app=express();
  app.disable('x-powered-by');
  app.use(helmet({contentSecurityPolicy:{directives:{
    defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com','https://cdn.jsdelivr.net'],
    fontSrc:["'self'",'https://fonts.gstatic.com','https://cdn.jsdelivr.net','data:'],imgSrc:["'self'",'https:','data:'],
    connectSrc:["'self'"],objectSrc:["'none'"],upgradeInsecureRequests:config.cookieSecure?[]:null,
  }},strictTransportSecurity:config.cookieSecure?undefined:false}));
  app.use(express.json({limit:'128kb'}));
  app.use(cookieParser());
  app.use('/api',rateLimit({windowMs:60000,limit:600,standardHeaders:'draft-8',legacyHeaders:false,
    message:{error:'Muitas requisições. Aguarde um minuto.'}}));
  app.use('/api',async(req,res,next)=>{
    res.setHeader('Cache-Control','no-store');
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      if (req.get('Origin') && req.get('Origin')!==config.origin) return next(new HttpError(403,'Origem não autorizada. Confira APP_ORIGIN.'));
      if (!req.is('application/json')) return next(new HttpError(415,'Envie o corpo como application/json.'));
    }
    const token=req.cookies.kings_session;
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const row=(await pool.query(`SELECT u.*,s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id
        WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active`,[digest(token)])).rows[0];
      if (row) {req.user=publicUser(row);req.csrfToken=row.csrf_token;}
    }
    next();
  });
  const auth=(req,res,next)=>req.user?next():next(new HttpError(401,'Entre na sua conta para continuar.'));
  const roles=(...allowed)=>(req,res,next)=>allowed.includes(req.user?.role)?next():next(new HttpError(403,'Seu perfil não tem permissão para esta operação.'));
  const csrf=(req,res,next)=>req.csrfToken && req.get('X-CSRF-Token')===req.csrfToken?next():next(new HttpError(403,'Sessão inválida. Atualize a página e tente novamente.'));
  const authLimiter=rateLimit({windowMs:15*60000,limit:30,skipSuccessfulRequests:true,standardHeaders:'draft-8',legacyHeaders:false,
    message:{error:'Muitas tentativas. Aguarde 15 minutos.'}});
  app.get('/api/health',async(req,res)=>{await pool.query('SELECT 1');res.json({status:'ok',database:'postgresql'});});
  app.get('/api/config',(req,res)=>res.json({paymentMode:config.paymentMode,demoAccounts:config.demoAccounts,reservationMinutes:config.reservationMinutes}));
  app.get('/api/auth/session',(req,res)=>res.json({user:req.user || null,csrfToken:req.csrfToken || null}));
  app.post('/api/auth/register',authLimiter,async(req,res)=>{
    const data=registration.parse(req.body);
    const passwordHash=await hashPassword(data.password);
    const row=(await pool.query('INSERT INTO users(name,email,password_hash,phone) VALUES($1,$2,$3,$4) RETURNING *',
      [data.name,data.email,passwordHash,data.phone])).rows[0];
    res.status(201).json({user:publicUser(row)});
  });
  // Uma verificação fictícia mantém o custo de tentativas com e-mail inexistente semelhante ao de uma senha incorreta.
  const dummyHash=hashPassword('unusable-'+Math.random());
  app.post('/api/auth/login',authLimiter,async(req,res)=>{
    const data=credentials.parse(req.body);
    const user=(await pool.query('SELECT * FROM users WHERE email=$1',[data.email])).rows[0];
    const valid=await verifyPassword(data.password,user?.password_hash || await dummyHash);
    if (!user || !user.active || !valid) fail(401,'E-mail ou senha incorretos.');
    const session=await transaction(pool,async db=>{
      if (req.cookies.kings_session) await db.query('DELETE FROM sessions WHERE token_hash=$1',[digest(req.cookies.kings_session)]);
      return createSession(db,user.id,config);
    });
    sessionCookie(res,session.token,config);
    res.json({user:publicUser(user),csrfToken:session.csrfToken});
  });
  app.post('/api/auth/logout',auth,csrf,async(req,res)=>{
    await pool.query('DELETE FROM sessions WHERE token_hash=$1',[digest(req.cookies.kings_session)]);
    res.clearCookie('kings_session',{httpOnly:true,secure:config.cookieSecure,sameSite:'lax',path:'/'});
    res.json({ok:true});
  });
  app.get('/api/categories',async(req,res)=>res.json((await pool.query('SELECT id,name FROM categories ORDER BY name')).rows));
  app.get('/api/products',async(req,res)=>{
    const params=[];const filters=[];
    if (req.user?.role!=='admin' || req.query.includeInactive!=='true') filters.push('p.active');
    if (req.query.q) {const q=z.string().max(100).parse(req.query.q);params.push(`%${q}%`);filters.push(`(p.name ILIKE $${params.length} OR p.brand ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`);}
    if (req.query.category) {params.push(z.string().max(80).parse(req.query.category));filters.push(`c.name=$${params.length}`);}
    const {rows}=await pool.query(`${productSelect}${filters.length?' WHERE '+filters.join(' AND '):''} ORDER BY p.id`,params);
    res.json(rows.map(productDto));
  });
  app.post('/api/products',auth,roles('admin'),csrf,async(req,res)=>{
    const p=productSchema.extend({stock:z.number().int().min(0).max(1000000).default(0)}).strict().parse(req.body);
    const result=await transaction(pool,async db=>{
      const category=(await db.query('SELECT id FROM categories WHERE name=$1',[p.category])).rows[0];
      const row=(await db.query(`INSERT INTO products(category_id,brand,name,description,specs,volume,price_cents,stock,min_stock,barcode,image,active)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [category.id,p.brand,p.name,p.description,p.specs,p.volume,Math.round(p.price*100),p.stock,p.minStock,p.barcode || null,p.image,p.active])).rows[0];
      if(p.stock) await db.query(`INSERT INTO inventory_movements(product_id,actor_id,kind,stock_delta,stock_after,reserved_after,reason)
        VALUES($1,$2,'initial',$3,$3,0,'Cadastro de produto')`,[row.id,req.user.id,p.stock]);
      return productDto((await db.query(`${productSelect} WHERE p.id=$1`,[row.id])).rows[0]);
    });
    res.status(201).json(result);
  });
  app.patch('/api/products/:id',auth,roles('admin'),csrf,async(req,res)=>{
    const id=positiveId.parse(req.params.id);
    const p=productSchema.strict().parse(req.body);
    const category=(await pool.query('SELECT id FROM categories WHERE name=$1',[p.category])).rows[0];
    const row=(await pool.query(`UPDATE products SET category_id=$2,brand=$3,name=$4,description=$5,specs=$6,volume=$7,
      price_cents=$8,min_stock=$9,barcode=$10,image=$11,active=$12 WHERE id=$1 RETURNING id`,
      [id,category.id,p.brand,p.name,p.description,p.specs,p.volume,Math.round(p.price*100),p.minStock,p.barcode || null,p.image,p.active])).rows[0];
    if (!row) fail(404,'Produto não encontrado.');
    res.json(productDto((await pool.query(`${productSelect} WHERE p.id=$1`,[id])).rows[0]));
  });
  app.post('/api/inventory/:id/receipts',auth,roles('admin'),csrf,async(req,res)=>{
    const id=positiveId.parse(req.params.id);
    const data=z.object({quantity:z.number().int().min(1).max(1000000),reason:z.string().trim().min(3).max(240).default('Entrada de mercadoria')}).strict().parse(req.body);
    res.status(201).json(await receiveStock(pool,id,data.quantity,data.reason,req.user.id));
  });
  app.get('/api/inventory/movements',auth,roles('admin'),async(req,res)=>{
    const id=req.query.productId?positiveId.parse(req.query.productId):null;
    const limit=z.coerce.number().int().min(1).max(200).default(100).parse(req.query.limit);
    const offset=z.coerce.number().int().nonnegative().default(0).parse(req.query.offset);
    res.json((await pool.query(`SELECT m.*,p.name AS product_name,u.name AS actor_name FROM inventory_movements m
      JOIN products p ON p.id=m.product_id LEFT JOIN users u ON u.id=m.actor_id
      WHERE ($1::int IS NULL OR m.product_id=$1) ORDER BY m.id DESC LIMIT $2 OFFSET $3`,[id,limit,offset])).rows);
  });
  app.get('/api/inventory/low-stock',auth,roles('admin'),async(req,res)=>res.json((await pool.query(`${productSelect} WHERE p.active AND p.stock-p.reserved_stock<=p.min_stock ORDER BY p.id`)).rows.map(productDto)));
  const cartAccess=[auth,roles('cliente','admin')];
  app.get('/api/cart',...cartAccess,async(req,res)=>res.json(await cartDto(pool,req.user.id)));
  app.put('/api/cart/items/:id',...cartAccess,csrf,async(req,res)=>{
    const id=positiveId.parse(req.params.id);
    const qty=z.object({quantity:z.number().int().min(0).max(999)}).strict().parse(req.body).quantity;
    const cart=await transaction(pool,async db=>{
      await db.query('SELECT pg_advisory_xact_lock(74122,$1)',[req.user.id]);
      if (!qty) await db.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2',[req.user.id,id]);
      else {
        const p=(await db.query('SELECT * FROM products WHERE id=$1 FOR SHARE',[id])).rows[0];
        if (!p || !p.active) fail(404,'Produto indisponível.');
        if (qty>p.stock-p.reserved_stock) fail(409,`Estoque insuficiente. Disponível: ${p.stock-p.reserved_stock}.`);
        await db.query('INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET updated_at=now()',[req.user.id]);
        await db.query('INSERT INTO cart_items(user_id,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity',[req.user.id,id,qty]);
      }
      return cartDto(db,req.user.id);
    });
    res.json(cart);
  });
  app.get('/api/orders',auth,async(req,res)=>res.json(await readOrders(pool,req.user.role==='cliente'?'o.user_id=$1':'true',req.user.role==='cliente'?[req.user.id]:[])));
  app.get('/api/orders/:code',auth,async(req,res)=>{
    const code=codeParam.parse(req.params.code);
    const row=(await readOrders(pool,req.user.role==='cliente'?'o.code=$1 AND o.user_id=$2':'o.code=$1',req.user.role==='cliente'?[code,req.user.id]:[code]))[0];
    if(!row) fail(404,'Pedido não encontrado.');res.json(row);
  });
  app.post('/api/orders',...cartAccess,csrf,async(req,res)=>{
    const data=checkoutSchema.parse(req.body);const key=z.uuid().parse(req.get('Idempotency-Key'));
    res.status(201).json(await createOrder(pool,req.user,data,key,'online',config));
  });
  app.post('/api/pdv/sales',auth,roles('funcionario','admin'),csrf,async(req,res)=>{
    const data=saleSchema.parse(req.body);const key=z.uuid().parse(req.get('Idempotency-Key'));
    res.status(201).json(await createOrder(pool,req.user,data,key,'pdv',config));
  });
  app.post('/api/orders/:code/payments/mock-confirm',...cartAccess,csrf,async(req,res)=>res.json(await confirmPayment(pool,req.user,codeParam.parse(req.params.code),config)));
  app.post('/api/orders/:code/cancel',...cartAccess,csrf,async(req,res)=>res.json(await cancelOrder(pool,req.user,codeParam.parse(req.params.code))));
  app.patch('/api/orders/:code/status',auth,roles('admin','funcionario'),csrf,async(req,res)=>{
    const {status}=z.object({status:z.enum(['Confirmado','Em Separação','Enviado','Entregue'])}).strict().parse(req.body);
    res.json(await updateStatus(pool,req.user,codeParam.parse(req.params.code),status));
  });
  app.get('/api/reports/sales',auth,roles('admin'),async(req,res)=>{
    const from=validDate.parse(req.query.from);const to=validDate.parse(req.query.to);
    if(from>to) fail(400,'A data inicial deve ser anterior à data final.');
    res.json(await salesReport(pool,from,to));
  });
  app.get('/api/users',auth,roles('admin'),async(req,res)=>res.json((await pool.query('SELECT * FROM users ORDER BY id')).rows.map(publicUser)));
  app.post('/api/users',auth,roles('admin'),csrf,async(req,res)=>{
    const data=registration.extend({role:z.enum(['cliente','funcionario','admin']),sector:z.string().max(80).optional()}).parse(req.body);
    const hash=await hashPassword(data.password);
    const user=(await pool.query('INSERT INTO users(name,email,password_hash,phone,role,sector) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[data.name,data.email,hash,data.phone,data.role,data.sector || null])).rows[0];
    res.status(201).json(publicUser(user));
  });
  app.use('/api',(req,res)=>res.status(404).json({error:'Rota da API não encontrada.'}));
  const dist=fileURLToPath(new URL('../dist/',import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist,{setHeaders(res,path){if(path.endsWith('sw.js')) res.setHeader('Cache-Control','no-cache');}}));
    app.get('/{*path}',(req,res,next)=>{
      if(req.path.includes('.')) return next();
      res.sendFile(fileURLToPath(new URL('../dist/index.html',import.meta.url)));
    });
  }
  app.use((err,req,res,next)=>{
    if(res.headersSent) return next(err);
    if(err instanceof z.ZodError) return res.status(400).json({error:'Confira os dados enviados.',details:err.issues.map(i=>({field:i.path.join('.'),message:i.message}))});
    if(err instanceof HttpError) return res.status(err.status).json({error:err.message});
    if(err.type==='entity.parse.failed') return res.status(400).json({error:'JSON inválido.'});
    if(err.type==='entity.too.large') return res.status(413).json({error:'Dados acima do limite permitido.'});
    if(err.code==='23505') return res.status(409).json({error:'E-mail, código de barras ou identificador já cadastrado.'});
    if(err.code==='23514' || err.code==='22003') return res.status(409).json({error:'A operação ultrapassa os limites de estoque ou valor permitidos.'});
    if(['55P03','40P01','40001'].includes(err.code)) return res.status(409).json({error:'Outra operação está atualizando estes dados. Tente novamente.'});
    console.error('Erro interno:',err);
    res.status(500).json({error:'Não foi possível concluir a operação. Tente novamente.'});
  });
  return app;
}
