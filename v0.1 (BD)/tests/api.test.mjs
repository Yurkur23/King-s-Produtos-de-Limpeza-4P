import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPool} from '../server/db.mjs';
import {migrate} from '../server/migrate.mjs';
import {seed} from '../server/seed.mjs';
import {createApp} from '../server/app.mjs';
import {loadConfig} from '../server/config.mjs';
import {expireOrders} from '../server/store.mjs';
const databaseUrl=process.env.TEST_DATABASE_URL;
if(!databaseUrl) throw new Error('Defina TEST_DATABASE_URL apontando para um PostgreSQL de testes. Veja README.');
const schema=`kings_test_${process.pid}_${Date.now()}`;
let adminPool,pool,server,base,admin,customer,employee,products;
const address={name:'Cliente de Teste',email:'teste@example.com',phone:'11999999999',cep:'01310-100',street:'Av. Paulista',number:'1000',complement:'',city:'São Paulo',state:'SP'};
async function call(path,{method='GET',body,session,csrf=true,key,origin}={}) {
  const headers={'Origin':origin || 'http://localhost:5173'};
  if(method!=='GET') headers['Content-Type']='application/json';
  if(session){headers.Cookie=session.cookie;if(csrf)headers['X-CSRF-Token']=session.csrfToken;}
  if(key)headers['Idempotency-Key']=key;
  const response=await fetch(base+path,{method,headers,body:method==='GET'?undefined:JSON.stringify(body || {})});
  return {status:response.status,body:await response.json(),headers:response.headers};
}
async function login(email,password) {
  const r=await call('/auth/login',{method:'POST',body:{email,password}});
  assert.equal(r.status,200,JSON.stringify(r.body));
  return {...r.body,cookie:r.headers.get('set-cookie').split(';')[0]};
}
async function cart(session,id,quantity) {return call(`/cart/items/${id}`,{method:'PUT',body:{quantity},session});}
async function checkout(session,key=randomUUID(),payment='Pix') {
  return call('/orders',{method:'POST',session,key,body:{payment,address}});
}
async function paidOrder() {
  await cart(customer,products[0].id,2);
  const order=await checkout(customer);
  assert.equal(order.status,201,JSON.stringify(order.body));
  const paid=await call(`/orders/${order.body.id}/payments/mock-confirm`,{method:'POST',session:customer});
  assert.equal(paid.status,200,JSON.stringify(paid.body));
  return paid.body;
}
before(async()=>{
  adminPool=createPool(databaseUrl);
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  const scoped=new URL(databaseUrl);scoped.searchParams.set('options',`-c search_path=${schema},public`);
  pool=createPool(scoped.href);
  await migrate(pool);
  const app=createApp({pool,config:loadConfig({DATABASE_URL:scoped.href,PAYMENT_MODE:'mock',SEED_DEMO:'true'})});
  server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  base=`http://127.0.0.1:${server.address().port}/api`;
});
after(async()=>{
  if(server) await new Promise(resolve=>server.close(resolve));
  if(pool)await pool.end();
  if(adminPool){await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await adminPool.end();}
});
beforeEach(async()=>{
  await pool.query('TRUNCATE users,categories,products RESTART IDENTITY CASCADE');
  await seed(pool);
  admin=await login('admin@kings.com.br','admin123');
  customer=await login('cliente@email.com','cliente123');
  employee=await login('funcionario@kings.com.br','func123');
  products=(await call('/products')).body;
});
test('cadastro salva hash e nunca aceita promoção de perfil pelo cliente',async()=>{
  const bad=await call('/auth/register',{method:'POST',body:{name:'Novo Cliente',email:'novo@example.com',password:'teste123',role:'admin'}});
  assert.equal(bad.status,400);
  const created=await call('/auth/register',{method:'POST',body:{name:'Novo Cliente',email:'NOVO@example.com',password:'teste123'}});
  assert.equal(created.status,201);assert.equal(created.body.user.role,'cliente');assert.ok(!('password' in created.body.user));assert.ok(!('password_hash' in created.body.user));
  const row=(await pool.query("SELECT * FROM users WHERE email='novo@example.com'")).rows[0];
  assert.match(row.password_hash,/^scrypt\$/);assert.ok(!row.password_hash.includes('teste123'));
  assert.equal((await call('/auth/register',{method:'POST',body:{name:'Duplicado',email:'novo@example.com',password:'teste123'}})).status,409);
});
test('sessão persiste, cookie é HttpOnly e logout revoga o token',async()=>{
  assert.match(customer.cookie,/kings_session=/);
  const session=await call('/auth/session',{session:customer});assert.equal(session.body.user.id,customer.user.id);
  assert.ok((await pool.query('SELECT token_hash FROM sessions')).rows.every(s=>!customer.cookie.includes(s.token_hash)));
  assert.equal((await call('/auth/logout',{method:'POST',session:customer})).status,200);
  assert.equal((await call('/cart',{session:customer})).status,401);
});
test('login inválido, SQL malicioso e leitura sem autenticação não abrem acesso',async()=>{
  assert.equal((await call('/auth/login',{method:'POST',body:{email:'admin@kings.com.br',password:"' OR 1=1 --"}})).status,401);
  assert.equal((await call('/orders')).status,401);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM users')).rows[0].n,3);
});
test('permissões, origem e CSRF são verificados no servidor',async()=>{
  for(const session of [customer,employee]) {
    assert.equal((await call('/reports/sales?from=2026-01-01&to=2026-12-31',{session})).status,403);
    assert.equal((await call('/products',{method:'POST',session,body:{}})).status,403);
    assert.equal((await call(`/inventory/${products[0].id}/receipts`,{method:'POST',session,body:{quantity:3}})).status,403);
  }
  assert.equal((await cart(customer,products[0].id,2)).status,200);
  assert.equal((await call(`/cart/items/${products[0].id}`,{method:'PUT',session:customer,csrf:false,body:{quantity:1}})).status,403);
  assert.equal((await call(`/cart/items/${products[0].id}`,{method:'PUT',session:customer,origin:'https://evil.example',body:{quantity:1}})).status,403);
});
test('carrinho fica no banco e impede quantidades negativas ou acima do disponível',async()=>{
  const p=products[0];assert.equal((await cart(customer,p.id,2)).status,200);
  const newSession=await login('cliente@email.com','cliente123');
  assert.equal((await call('/cart',{session:newSession})).body[0].quantity,2);
  assert.equal((await cart(customer,p.id,p.stock+1)).status,409);
  assert.equal((await cart(customer,p.id,-1)).status,400);
  assert.equal((await cart(customer,p.id,1.2)).status,400);
  assert.equal((await call('/cart',{session:customer})).body[0].quantity,2);
});
test('pedido reserva estoque; confirmação baixa uma única vez e total usa o preço do banco',async()=>{
  const p=products[0];await cart(customer,p.id,2);
  const key=randomUUID();
  const r=await checkout(customer,key);assert.equal(r.status,201,JSON.stringify(r.body));
  assert.equal(r.body.total,p.price*2);assert.equal(r.body.status,'Aguardando Pagamento');assert.equal(r.body.paymentStatus,'pending');
  let row=(await pool.query('SELECT stock,reserved_stock FROM products WHERE id=$1',[p.id])).rows[0];
  assert.deepEqual(row,{stock:p.stock,reserved_stock:2});
  assert.equal((await call('/cart',{session:customer})).body.length,0);
  const again=await checkout(customer,key);assert.equal(again.body.id,r.body.id);
  const different=await checkout(customer,key,'Cartão');assert.equal(different.status,409);
  const confirm=()=>call(`/orders/${r.body.id}/payments/mock-confirm`,{method:'POST',session:customer});
  const results=await Promise.all([confirm(),confirm()]);assert.ok(results.every(r=>r.status===200));
  row=(await pool.query('SELECT stock,reserved_stock FROM products WHERE id=$1',[p.id])).rows[0];
  assert.deepEqual(row,{stock:p.stock-2,reserved_stock:0});
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM inventory_movements WHERE order_id=$1 AND kind='sale'",[r.body.databaseId])).rows[0].n,1);
});
test('cliente não pode consultar, cancelar nem pagar pedido de outro, mesmo com o mesmo nome',async()=>{
  const order=await paidOrder();
  await call('/auth/register',{method:'POST',body:{name:customer.user.name,email:'outro@example.com',password:'teste123'}});
  const other=await login('outro@example.com','teste123');
  assert.deepEqual((await call('/orders',{session:other})).body,[]);
  assert.equal((await call(`/orders/${order.id}`,{session:other})).status,404);
  assert.equal((await call(`/orders/${order.id}/payments/mock-confirm`,{method:'POST',session:other})).status,404);
  assert.equal((await call(`/orders/${order.id}/cancel`,{method:'POST',session:other})).status,404);
});
test('cancelamento e expiração liberam a reserva sem diminuir estoque físico',async()=>{
  const p=products[0];await cart(customer,p.id,2);const order=(await checkout(customer)).body;
  assert.equal((await call(`/orders/${order.id}/cancel`,{method:'POST',session:customer})).status,200);
  assert.equal((await call(`/orders/${order.id}/payments/mock-confirm`,{method:'POST',session:customer})).status,409);
  await cart(customer,p.id,3);const expired=(await checkout(customer)).body;
  await pool.query("UPDATE orders SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.databaseId]);
  assert.equal(await expireOrders(pool),1);
  assert.equal(await expireOrders(pool),0);
  const row=(await pool.query('SELECT stock,reserved_stock FROM products WHERE id=$1',[p.id])).rows[0];
  assert.deepEqual(row,{stock:p.stock,reserved_stock:0});
  assert.equal((await call(`/orders/${expired.id}`,{session:customer})).body.status,'Expirado');
});
test('confirmação após prazo expira o pedido e confirma a liberação no banco',async()=>{
  const p=products[0];await cart(customer,p.id,1);const order=(await checkout(customer)).body;
  await pool.query("UPDATE orders SET expires_at=now()-interval '1 second' WHERE id=$1",[order.databaseId]);
  assert.equal((await call(`/orders/${order.id}/payments/mock-confirm`,{method:'POST',session:customer})).status,409);
  assert.equal((await pool.query('SELECT reserved_stock FROM products WHERE id=$1',[p.id])).rows[0].reserved_stock,0);
});
test('duas vendas simultâneas da última unidade resultam em uma venda e uma rejeição',async()=>{
  const p=products[0];await pool.query('UPDATE products SET stock=1 WHERE id=$1',[p.id]);
  const sale=session=>call('/pdv/sales',{method:'POST',session,key:randomUUID(),body:{payment:'Pix',items:[{productId:p.id,quantity:1}]}});
  const results=await Promise.all([sale(employee),sale(admin)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  assert.equal((await pool.query('SELECT stock FROM products WHERE id=$1',[p.id])).rows[0].stock,0);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM orders')).rows[0].n,1);
});
test('reserva online bloqueia PDV concorrente, e repetição de checkout não duplica pedido',async()=>{
  const p=products[0];await pool.query('UPDATE products SET stock=1 WHERE id=$1',[p.id]);await cart(customer,p.id,1);
  const key=randomUUID();const results=await Promise.all([checkout(customer,key),checkout(customer,key)]);
  assert.ok(results.every(r=>r.status===201));assert.equal(results[0].body.id,results[1].body.id);
  const sale=await call('/pdv/sales',{method:'POST',session:employee,key:randomUUID(),body:{payment:'Cartão',items:[{productId:p.id,quantity:1}]}});
  assert.equal(sale.status,409);assert.equal((await pool.query('SELECT count(*)::int AS n FROM orders')).rows[0].n,1);
});
test('falha em um item desfaz toda a venda; preço e duplicação de itens são rejeitados',async()=>{
  const [p,q]=products;await pool.query('UPDATE products SET stock=0 WHERE id=$1',[q.id]);
  const sale=body=>call('/pdv/sales',{method:'POST',session:employee,key:randomUUID(),body});
  assert.equal((await sale({payment:'Pix',items:[{productId:p.id,quantity:1},{productId:q.id,quantity:1}]})).status,409);
  assert.equal((await pool.query('SELECT stock FROM products WHERE id=$1',[p.id])).rows[0].stock,p.stock);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM orders')).rows[0].n,0);
  assert.equal((await sale({payment:'Pix',items:[{productId:p.id,quantity:1,price:0.01}]})).status,400);
  assert.equal((await sale({payment:'Pix',items:[{productId:p.id,quantity:1},{productId:p.id,quantity:1}]})).status,400);
});
test('snapshot mantém nome e preço da compra depois de alteração do produto',async()=>{
  const order=await paidOrder();const p=products[0];
  await pool.query("UPDATE products SET name='Outro nome',price_cents=99999,active=false WHERE id=$1",[p.id]);
  const found=(await call(`/orders/${order.id}`,{session:customer})).body;
  assert.equal(found.items[0].product.name,p.name);assert.equal(found.items[0].product.price,p.price);
  assert.ok(!(await call('/products')).body.some(x=>x.id===p.id));
  assert.equal((await cart(customer,p.id,1)).status,404);
});
test('relatório filtra pela data do pagamento e não conta pedidos pendentes',async()=>{
  const order=await paidOrder();await cart(customer,products[1].id,1);await checkout(customer);
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  const report=await call(`/reports/sales?from=${today}&to=${today}`,{session:admin});
  assert.equal(report.status,200,JSON.stringify(report.body));assert.equal(report.body.count,1);assert.equal(report.body.revenue,order.total);
  assert.equal(report.body.topProducts[0].units,2);
  const empty=await call('/reports/sales?from=2000-01-01&to=2000-01-31',{session:admin});assert.equal(empty.body.average,0);
  assert.equal((await call('/reports/sales?from=2026-12-31&to=2026-01-01',{session:admin})).status,400);
});
test('status não pula etapas nem confirma pagamento pelo seletor',async()=>{
  await cart(customer,products[0].id,1);const order=(await checkout(customer)).body;
  const update=status=>call(`/orders/${order.id}/status`,{method:'PATCH',session:employee,body:{status}});
  assert.equal((await update('Confirmado')).status,409);
  await call(`/orders/${order.id}/payments/mock-confirm`,{method:'POST',session:customer});
  assert.equal((await update('Entregue')).status,409);
  for(const status of ['Em Separação','Enviado','Entregue'])assert.equal((await update(status)).status,200);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM order_status_history WHERE order_id=$1',[order.databaseId])).rows[0].n,5);
});
test('migrações e seed repetidos preservam vendas e estoque; ledger confere com o saldo',async()=>{
  await paidOrder();const p=products[0];
  await call(`/inventory/${p.id}/receipts`,{method:'POST',session:admin,body:{quantity:3,reason:'Reposição de teste'}});
  await migrate(pool);await seed(pool);
  const row=(await pool.query('SELECT stock,reserved_stock FROM products WHERE id=$1',[p.id])).rows[0];assert.equal(row.stock,p.stock+1);
  const sums=(await pool.query('SELECT sum(stock_delta)::int AS stock,sum(reserved_delta)::int AS reserved_stock FROM inventory_movements WHERE product_id=$1',[p.id])).rows[0];assert.deepEqual(sums,row);
});
