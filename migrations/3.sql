CREATE TABLE payfast_itn_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  m_payment_id TEXT,
  pf_payment_id TEXT,
  payment_status TEXT NOT NULL,
  amount_gross TEXT,
  amount_fee TEXT,
  amount_net TEXT,
  item_name TEXT,
  email_address TEXT,
  merchant_id TEXT,
  signature TEXT,
  signature_valid INTEGER NOT NULL DEFAULT 0,
  merchant_valid INTEGER NOT NULL DEFAULT 0,
  server_valid INTEGER NOT NULL DEFAULT 0,
  is_valid INTEGER NOT NULL DEFAULT 0,
  source_ip TEXT,
  raw_payload TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payfast_itn_events_m_payment_id ON payfast_itn_events(m_payment_id);
CREATE INDEX idx_payfast_itn_events_pf_payment_id ON payfast_itn_events(pf_payment_id);
CREATE INDEX idx_payfast_itn_events_created_at ON payfast_itn_events(created_at);
