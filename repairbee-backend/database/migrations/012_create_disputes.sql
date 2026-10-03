-- Migration 012: Create disputes table

CREATE TYPE dispute_status AS ENUM ('open', 'resolved', 'rejected');
CREATE TYPE resolution_type AS ENUM ('refund', 're_repair', 'rejected');

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES repair_orders(id),
  raised_by_id UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  status dispute_status NOT NULL DEFAULT 'open',
  resolution_type resolution_type,
  admin_notes TEXT,
  resolved_by_id UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_raised_by ON disputes(raised_by_id);
