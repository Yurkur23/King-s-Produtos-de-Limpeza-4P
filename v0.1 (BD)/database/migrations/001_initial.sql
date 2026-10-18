-- Kings Produtos de Limpeza. Valores monetários em centavos; horários em timestamptz.
CREATE TABLE users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(120) NOT NULL CHECK (length(trim(name)) >= 2),
  email varchar(254) NOT NULL CHECK (email = lower(trim(email))),
  password_hash text NOT NULL,
  role varchar(16) NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente','funcionario','admin')),
  phone varchar(30) NOT NULL DEFAULT '',
  cpf varchar(18),
  sector varchar(80),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);
CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token varchar(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE categories (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(80) NOT NULL UNIQUE
);
CREATE TABLE products (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id integer NOT NULL REFERENCES categories(id),
  brand varchar(100) NOT NULL,
  name varchar(150) NOT NULL CHECK (length(trim(name)) >= 2),
  description text NOT NULL DEFAULT '',
  specs text[] NOT NULL DEFAULT '{}',
  volume varchar(60) NOT NULL DEFAULT '',
  price_cents integer NOT NULL CHECK (price_cents BETWEEN 1 AND 100000000),
  stock integer NOT NULL DEFAULT 0 CHECK (stock BETWEEN 0 AND 1000000),
  reserved_stock integer NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0 AND reserved_stock <= stock),
  min_stock integer NOT NULL DEFAULT 5 CHECK (min_stock BETWEEN 0 AND 1000000),
  barcode varchar(64) UNIQUE,
  image text NOT NULL DEFAULT '/icons/icon-192.png',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products(category_id);
CREATE INDEX products_name_idx ON products(lower(name));
CREATE INDEX products_low_stock_idx ON products(stock, min_stock) WHERE active;
CREATE TABLE carts (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cart_items (
  user_id integer NOT NULL REFERENCES carts(user_id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 999),
  PRIMARY KEY (user_id, product_id)
);
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) NOT NULL UNIQUE,
  user_id integer NOT NULL REFERENCES users(id),
  channel varchar(10) NOT NULL CHECK (channel IN ('online','pdv')),
  customer_name varchar(120) NOT NULL,
  delivery_address jsonb NOT NULL DEFAULT '{}',
  status varchar(32) NOT NULL CHECK (status IN ('Aguardando Pagamento','Confirmado','Em Separação','Enviado','Entregue','Cancelado','Expirado')),
  total_cents bigint NOT NULL CHECK (total_cents > 0),
  idempotency_key uuid NOT NULL,
  request_hash char(64) NOT NULL,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CHECK (channel <> 'pdv' OR status = 'Entregue')
);
CREATE INDEX orders_user_date_idx ON orders(user_id, created_at DESC);
CREATE INDEX orders_paid_date_idx ON orders(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX orders_expiry_idx ON orders(expires_at) WHERE status = 'Aguardando Pagamento';
CREATE TABLE order_items (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  product_id integer NOT NULL REFERENCES products(id),
  product_snapshot jsonb NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 999),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents > 0),
  subtotal_cents bigint GENERATED ALWAYS AS (quantity::bigint * unit_price_cents) STORED,
  UNIQUE (order_id, product_id)
);
CREATE INDEX order_items_product_idx ON order_items(product_id);
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  method varchar(10) NOT NULL CHECK (method IN ('Pix','Cartão')),
  provider varchar(20) NOT NULL CHECK (provider IN ('mock','pos')),
  status varchar(16) NOT NULL CHECK (status IN ('pending','paid','cancelled','expired')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  provider_reference varchar(150) UNIQUE,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE inventory_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products(id),
  order_id uuid REFERENCES orders(id),
  actor_id integer REFERENCES users(id),
  kind varchar(12) NOT NULL CHECK (kind IN ('initial','receipt','reserve','sale','release')),
  stock_delta integer NOT NULL DEFAULT 0,
  reserved_delta integer NOT NULL DEFAULT 0,
  stock_after integer NOT NULL CHECK (stock_after >= 0),
  reserved_after integer NOT NULL CHECK (reserved_after BETWEEN 0 AND stock_after),
  reason varchar(240) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (stock_delta <> 0 OR reserved_delta <> 0)
);
CREATE INDEX inventory_product_date_idx ON inventory_movements(product_id, created_at DESC);
CREATE INDEX inventory_order_idx ON inventory_movements(order_id);
CREATE TABLE order_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  from_status varchar(32),
  to_status varchar(32) NOT NULL,
  actor_id integer REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_history_idx ON order_status_history(order_id, created_at);
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
