-- Migration 009: Create deliveries table

CREATE TYPE delivery_leg AS ENUM ('pickup', 'return');
CREATE TYPE delivery_status AS ENUM ('assigned', 'out_for_pickup', 'picked_up', 'out_for_delivery', 'delivered');

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES repair_orders(id),
  partner_id UUID NOT NULL REFERENCES users(id),
  leg_type delivery_leg NOT NULL,
  origin_address TEXT,
  origin_lat DECIMAL(10, 7),
  origin_lng DECIMAL(10, 7),
  destination_address TEXT,
  destination_lat DECIMAL(10, 7),
  destination_lng DECIMAL(10, 7),
  distance_km DECIMAL(8, 2),
  rate_per_km DECIMAL(6, 2) NOT NULL DEFAULT 10.00,
  earnings DECIMAL(10, 2),
  status delivery_status NOT NULL DEFAULT 'assigned',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX idx_deliveries_partner_id ON deliveries(partner_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
