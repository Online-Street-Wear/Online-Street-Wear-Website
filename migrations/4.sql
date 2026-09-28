CREATE TABLE IF NOT EXISTS customer_orders (
  order_number TEXT PRIMARY KEY,
  payment_reference TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_orders_email ON customer_orders(customer_email);
CREATE INDEX IF NOT EXISTS customer_orders_created ON customer_orders(created_at);
