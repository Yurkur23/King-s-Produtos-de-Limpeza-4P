import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createPool, transaction } from './db.mjs';
import { hashPassword } from './security.mjs';
export const DEMO_USERS = [
  { name: 'Carlos Administrador', email: 'admin@kings.com.br', password: 'admin123', role: 'admin' },
  { name: 'Rafael Funcionário', email: 'funcionario@kings.com.br', password: 'func123', role: 'funcionario', sector: 'Atendimento' },
  { name: 'Maria Silva', email: 'cliente@email.com', password: 'cliente123', role: 'cliente', phone: '(11) 98765-4321' },
];
export async function seed(pool) {
  const products = JSON.parse(await readFile(new URL('../database/products.json', import.meta.url), 'utf8'));
  const hashes = await Promise.all(DEMO_USERS.map(u => hashPassword(u.password)));
  await transaction(pool, async db => {
    await db.query('SELECT pg_advisory_xact_lock(74121)');
    for (const [index, u] of DEMO_USERS.entries()) {
      await db.query(`INSERT INTO users(name,email,password_hash,role,phone,sector) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(email) DO NOTHING`, [u.name, u.email, hashes[index], u.role, u.phone || '', u.sector || null]);
    }
    for (const name of ['Limpeza Geral', 'Limpeza Automotiva', 'Equipamentos']) {
      await db.query('INSERT INTO categories(name) VALUES($1) ON CONFLICT(name) DO NOTHING', [name]);
    }
    for (const p of products) {
      const category = (await db.query('SELECT id FROM categories WHERE name=$1', [p.category])).rows[0];
      const result = await db.query(`INSERT INTO products(category_id,brand,name,description,specs,volume,price_cents,stock,min_stock,barcode,image,active)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(barcode) DO NOTHING RETURNING id`,
        [category.id,p.brand,p.name,p.description,p.specs,p.volume,Math.round(p.price*100),p.stock,p.minStock,p.barcode,p.image,p.active]);
      if (result.rows[0] && p.stock) await db.query(`INSERT INTO inventory_movements
        (product_id,kind,stock_delta,stock_after,reserved_after,reason) VALUES($1,'initial',$2,$2,0,'Carga inicial do catálogo')`,
        [result.rows[0].id,p.stock]);
    }
  });
  console.log('Dados de demonstração prontos. Registros existentes foram preservados.');
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const pool = createPool();
  try { await seed(pool); } finally { await pool.end(); }
}
