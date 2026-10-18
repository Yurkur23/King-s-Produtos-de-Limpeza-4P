import { randomUUID } from 'node:crypto';
import { transaction } from './db.mjs';
import { digest } from './security.mjs';
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };
export const productSelect = 'SELECT p.*, c.name AS category FROM products p JOIN categories c ON c.id=p.category_id';
export function productDto(p) {
  return { id:p.id, brand:p.brand, name:p.name, description:p.description, specs:p.specs,
    price:p.price_cents/100, category:p.category, volume:p.volume,
    stock:p.stock-p.reserved_stock, physicalStock:p.stock, reservedStock:p.reserved_stock,
    minStock:p.min_stock, barcode:p.barcode || '', image:p.image, active:p.active };
}
export async function cartDto(db, userId) {
  const { rows } = await db.query(`${productSelect} JOIN cart_items ci ON ci.product_id=p.id
    WHERE ci.user_id=$1 ORDER BY p.id`, [userId]);
  const quantities = (await db.query('SELECT product_id,quantity FROM cart_items WHERE user_id=$1', [userId])).rows;
  return rows.map(p => ({product:productDto(p), quantity:quantities.find(i => i.product_id===p.id)?.quantity || 0}));
}
export async function readOrders(db, where = 'true', params = []) {
  const { rows } = await db.query(`SELECT o.*, pay.method,pay.status AS payment_status,pay.provider
    FROM orders o JOIN payments pay ON pay.order_id=o.id WHERE ${where} ORDER BY o.created_at DESC,o.id`, params);
  if (!rows.length) return [];
  const items = (await db.query('SELECT * FROM order_items WHERE order_id=ANY($1::uuid[]) ORDER BY id', [rows.map(o=>o.id)])).rows;
  return rows.map(o => {
    const a = o.delivery_address;
    return { id:o.code, databaseId:o.id, userId:o.user_id, channel:o.channel,
      date:new Date(o.created_at).toLocaleDateString('pt-BR', {timeZone:'America/Sao_Paulo'}), createdAt:o.created_at,
      items:items.filter(i=>i.order_id===o.id).map(i=>({product:{...i.product_snapshot,price:i.unit_price_cents/100},quantity:i.quantity})),
      total:Number(o.total_cents)/100, status:o.status, payment:o.method, paymentStatus:o.payment_status,
      paymentProvider:o.provider, expiresAt:o.expires_at, paidAt:o.paid_at,
      address:o.channel==='pdv' ? 'Retirada no balcão' : `${a.street}, ${a.number}${a.complement ? ' - '+a.complement : ''} — ${a.city}/${a.state}, CEP ${a.cep}`,
      deliveryAddress:a, customer:o.customer_name };
  });
}
async function moveStock(db, productId, stockDelta, reservedDelta, kind, orderId, actorId, reason) {
  if (stockDelta===0 && reservedDelta===0) return;
  const p = (await db.query('UPDATE products SET stock=stock+$2,reserved_stock=reserved_stock+$3 WHERE id=$1 RETURNING *',
    [productId,stockDelta,reservedDelta])).rows[0];
  await db.query(`INSERT INTO inventory_movements(product_id,order_id,actor_id,kind,stock_delta,reserved_delta,stock_after,reserved_after,reason)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [productId,orderId,actorId,kind,stockDelta,reservedDelta,p.stock,p.reserved_stock,reason]);
}
export async function receiveStock(pool, id, quantity, reason, actorId) {
  return transaction(pool, async db => {
    const p = (await db.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!p) fail(404,'Produto não encontrado.');
    await moveStock(db,id,quantity,0,'receipt',null,actorId,reason);
    return productDto((await db.query(`${productSelect} WHERE p.id=$1`, [id])).rows[0]);
  });
}
export async function createOrder(pool, user, payload, key, channel, config) {
  const fingerprint = digest(JSON.stringify({channel,...payload}));
  return transaction(pool, async db => {
    // Serializa carrinho e repetição de requisições por usuário. Preços nunca vêm do navegador.
    await db.query('SELECT pg_advisory_xact_lock(74122,$1)', [user.id]);
    const previous = (await db.query('SELECT * FROM orders WHERE user_id=$1 AND idempotency_key=$2', [user.id,key])).rows[0];
    if (previous) {
      if (previous.request_hash !== fingerprint) fail(409,'Esta chave de requisição já foi usada com outros dados.');
      return (await readOrders(db,'o.id=$1',[previous.id]))[0];
    }
    if (channel==='online' && config.paymentMode!=='mock') fail(503,'Pagamento online indisponível. Configure um provedor antes de habilitar compras.');
    const items = channel==='online'
      ? (await db.query('SELECT product_id AS "productId",quantity FROM cart_items WHERE user_id=$1 ORDER BY product_id',[user.id])).rows
      : payload.items;
    if (!items.length) fail(400,'Adicione produtos antes de concluir a compra.');
    const products = (await db.query(`${productSelect} WHERE p.id=ANY($1::int[]) ORDER BY p.id FOR UPDATE OF p`,[items.map(i=>i.productId)])).rows;
    if (products.length!==items.length) fail(404,'Um produto não foi encontrado.');
    let total=0;
    for (const i of items) {
      const p=products.find(p=>p.id===i.productId);
      if (!p.active) fail(409,`O produto ${p.name} está desativado. Remova-o do carrinho.`);
      if (p.stock-p.reserved_stock<i.quantity) fail(409,`Estoque insuficiente para ${p.name}. Disponível: ${p.stock-p.reserved_stock}.`);
      total+=p.price_cents*i.quantity;
    }
    const id=randomUUID();
    const code=`${channel==='pdv'?'PDV':'KNG'}-${id.replaceAll('-','').slice(0,16).toUpperCase()}`;
    const status=channel==='pdv'?'Entregue':'Aguardando Pagamento';
    await db.query(`INSERT INTO orders(id,code,user_id,channel,customer_name,delivery_address,status,total_cents,idempotency_key,request_hash,expires_at,paid_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        CASE WHEN $4::varchar='online' THEN now()+($11::text||' minutes')::interval ELSE NULL END,
        CASE WHEN $4::varchar='pdv' THEN now() ELSE NULL END)`,
      [id,code,user.id,channel,channel==='pdv'?'Cliente Balcão':payload.address.name,payload.address || {},status,total,key,fingerprint,config.reservationMinutes]);
    for (const i of [...items].sort((a,b)=>a.productId-b.productId)) {
      const p=products.find(p=>p.id===i.productId);
      await db.query('INSERT INTO order_items(order_id,product_id,product_snapshot,quantity,unit_price_cents) VALUES($1,$2,$3,$4,$5)',
        [id,p.id,productDto(p),i.quantity,p.price_cents]);
      await moveStock(db,p.id,channel==='pdv'?-i.quantity:0,channel==='online'?i.quantity:0,
        channel==='pdv'?'sale':'reserve',id,user.id,channel==='pdv'?'Venda presencial recebida':'Reserva de pedido online');
    }
    await db.query(`INSERT INTO payments(order_id,method,provider,status,amount_cents,paid_at)
      VALUES($1,$2,$3,$4,$5,CASE WHEN $3::varchar='pos' THEN now() ELSE NULL END)`,
      [id,payload.payment,channel==='pdv'?'pos':'mock',channel==='pdv'?'paid':'pending',total]);
    await db.query('INSERT INTO order_status_history(order_id,to_status,actor_id) VALUES($1,$2,$3)',[id,status,user.id]);
    if (channel==='online') await db.query('DELETE FROM cart_items WHERE user_id=$1',[user.id]);
    return (await readOrders(db,'o.id=$1',[id]))[0];
  });
}
async function releaseOrder(db, order, status, actorId) {
  const items=(await db.query('SELECT product_id,quantity FROM order_items WHERE order_id=$1 ORDER BY product_id',[order.id])).rows;
  await db.query('SELECT id FROM products WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE',[items.map(i=>i.product_id)]);
  for (const i of items) await moveStock(db,i.product_id,0,-i.quantity,'release',order.id,actorId,
    status==='Expirado'?'Reserva expirada':'Pedido cancelado');
  await db.query('UPDATE orders SET status=$2 WHERE id=$1',[order.id,status]);
  await db.query('UPDATE payments SET status=$2 WHERE order_id=$1',[order.id,status==='Expirado'?'expired':'cancelled']);
  await db.query('INSERT INTO order_status_history(order_id,from_status,to_status,actor_id) VALUES($1,$2,$3,$4)',
    [order.id,order.status,status,actorId]);
}
export async function expireOrders(pool) {
  const ids=(await pool.query("SELECT id FROM orders WHERE status='Aguardando Pagamento' AND expires_at<=now() ORDER BY id")).rows;
  let count=0;
  for (const {id} of ids) count+=await transaction(pool,async db=>{
    const order=(await db.query("SELECT * FROM orders WHERE id=$1 AND status='Aguardando Pagamento' AND expires_at<=now() FOR UPDATE SKIP LOCKED",[id])).rows[0];
    if (!order) return 0;
    await releaseOrder(db,order,'Expirado',null);
    return 1;
  });
  return count;
}

export async function confirmPayment(pool, user, code, config) {
  if (config.paymentMode!=='mock') fail(404,'Simulação de pagamento desabilitada.');
  const result=await transaction(pool,async db=>{
    const order=(await db.query('SELECT * FROM orders WHERE code=$1 FOR UPDATE',[code])).rows[0];
    if (!order || (user.role!=='admin' && order.user_id!==user.id)) fail(404,'Pedido não encontrado.');
    const payment=(await db.query('SELECT * FROM payments WHERE order_id=$1',[order.id])).rows[0];
    if (payment.provider!=='mock') fail(409,'Este pedido não usa o pagamento demonstrativo.');
    if (payment.status==='paid') return {order:(await readOrders(db,'o.id=$1',[order.id]))[0]};
    if (order.status!=='Aguardando Pagamento') fail(409,'O pedido não está aguardando pagamento.');
    if (new Date(order.expires_at)<=new Date()) {
      await releaseOrder(db,order,'Expirado',user.id);
      return {expired:true};
    }
    const items=(await db.query('SELECT product_id,quantity FROM order_items WHERE order_id=$1 ORDER BY product_id',[order.id])).rows;
    await db.query('SELECT id FROM products WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE',[items.map(i=>i.product_id)]);
    for (const i of items) await moveStock(db,i.product_id,-i.quantity,-i.quantity,'sale',order.id,user.id,'Confirmação de pagamento demonstrativo');
    await db.query("UPDATE payments SET status='paid',paid_at=now(),provider_reference=$2 WHERE order_id=$1",[order.id,`mock-${payment.id}`]);
    await db.query("UPDATE orders SET status='Confirmado',paid_at=now() WHERE id=$1",[order.id]);
    await db.query("INSERT INTO order_status_history(order_id,from_status,to_status,actor_id) VALUES($1,$2,'Confirmado',$3)",[order.id,order.status,user.id]);
    return {order:(await readOrders(db,'o.id=$1',[order.id]))[0]};
  });
  if (result.expired) fail(409,'A reserva expirou. Faça um novo pedido.');
  return result.order;
}
export async function cancelOrder(pool,user,code) {
  return transaction(pool,async db=>{
    const order=(await db.query('SELECT * FROM orders WHERE code=$1 FOR UPDATE',[code])).rows[0];
    if (!order || (user.role!=='admin' && user.id!==order.user_id)) fail(404,'Pedido não encontrado.');
    if (order.status==='Cancelado') return (await readOrders(db,'o.id=$1',[order.id]))[0];
    if (order.status!=='Aguardando Pagamento') fail(409,'Somente pedidos sem pagamento podem ser cancelados nesta versão.');
    await releaseOrder(db,order,'Cancelado',user.id);
    return (await readOrders(db,'o.id=$1',[order.id]))[0];
  });
}
export async function updateStatus(pool,user,code,status) {
  return transaction(pool,async db=>{
    const order=(await db.query('SELECT * FROM orders WHERE code=$1 FOR UPDATE',[code])).rows[0];
    if (!order) fail(404,'Pedido não encontrado.');
    const next={'Confirmado':'Em Separação','Em Separação':'Enviado','Enviado':'Entregue'};
    if (status===order.status) return (await readOrders(db,'o.id=$1',[order.id]))[0];
    if (!order.paid_at || next[order.status]!==status) fail(409,'Confirme o pagamento e siga a sequência: Confirmado → Em Separação → Enviado → Entregue.');
    await db.query('UPDATE orders SET status=$2 WHERE id=$1',[order.id,status]);
    await db.query('INSERT INTO order_status_history(order_id,from_status,to_status,actor_id) VALUES($1,$2,$3,$4)',[order.id,order.status,status,user.id]);
    return (await readOrders(db,'o.id=$1',[order.id]))[0];
  });
}
export async function salesReport(pool,from,to) {
  const condition="o.paid_at IS NOT NULL AND (o.paid_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $1::date AND $2::date";
  // Mesmo snapshot para resumo, itens e pedidos, inclusive durante pagamentos concorrentes.
  return transaction(pool,async db=>{
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const summary=(await db.query(`SELECT count(*)::int AS count,coalesce(sum(o.total_cents),0) AS revenue,
      count(*) FILTER(WHERE o.status='Entregue')::int AS delivered FROM orders o WHERE ${condition}`,[from,to])).rows[0];
    const top=(await db.query(`SELECT i.product_id AS id,max(i.product_snapshot->>'name') AS name,
      sum(i.quantity)::int AS units,sum(i.subtotal_cents) AS revenue FROM order_items i JOIN orders o ON o.id=i.order_id
      WHERE ${condition} GROUP BY i.product_id ORDER BY units DESC,i.product_id LIMIT 10`,[from,to])).rows;
    const orders=await readOrders(db,condition,[from,to]);
    const revenue=Number(summary.revenue)/100;
    return {from,to,count:summary.count,revenue,average:summary.count?revenue/summary.count:0,delivered:summary.delivered,
      topProducts:top.map(p=>({...p,revenue:Number(p.revenue)/100})),orders};
  });
}
