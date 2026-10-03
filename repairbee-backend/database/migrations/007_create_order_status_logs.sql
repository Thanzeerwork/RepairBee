-- Migration 007: Create order_status_logs table

CREATE TABLE order_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  updated_by_role user_role NOT NULL,
  updated_by_id UUID NOT NULL REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_logs_order_id ON order_status_logs(order_id);
CREATE INDEX idx_status_logs_order_time ON order_status_logs(order_id, created_at);
