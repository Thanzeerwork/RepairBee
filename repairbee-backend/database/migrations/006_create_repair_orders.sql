-- Migration 006: Create repair_orders table

CREATE TYPE order_type AS ENUM ('sos', 'scheduled');
CREATE TYPE order_status AS ENUM (
  'repair_requested',
  'quote_sent',
  'quote_approved',
  'quote_rejected',
  'payment_confirmed',
  'pickup_requested',
  'partner_assigned',
  'out_for_pickup',
  'picked_up',
  'received_at_shop',
  'diagnosis_in_progress',
  'repair_in_progress',
  'repair_completed',
  'out_for_delivery',
  'delivered',
  'delivery_confirmed',
  'cancelled'
);

CREATE TABLE repair_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),
  product_id UUID NOT NULL REFERENCES products(id),
  issue_ids UUID[] NOT NULL DEFAULT '{}',
  description TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  order_type order_type NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  pickup_address_id UUID REFERENCES addresses(id),
  delivery_address_id UUID REFERENCES addresses(id),
  current_status order_status NOT NULL DEFAULT 'repair_requested',
  
  -- Quote & pricing
  quote_amount DECIMAL(10, 2),
  estimated_repair_time VARCHAR(100),
  delivery_charge DECIMAL(10, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(10, 2),
  commission_amount DECIMAL(10, 2),
  shop_payout DECIMAL(10, 2),
  promo_code_id UUID,
  
  -- Warranty
  warranty_days INTEGER DEFAULT 0,
  warranty_expires_at TIMESTAMPTZ,
  parent_order_id UUID REFERENCES repair_orders(id),
  is_warranty_claim BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_repair_orders_customer_id ON repair_orders(customer_id);
CREATE INDEX idx_repair_orders_shop_id ON repair_orders(shop_id);
CREATE INDEX idx_repair_orders_status ON repair_orders(current_status);
CREATE INDEX idx_repair_orders_customer_status ON repair_orders(customer_id, current_status);
CREATE INDEX idx_repair_orders_shop_status ON repair_orders(shop_id, current_status);
CREATE INDEX idx_repair_orders_parent ON repair_orders(parent_order_id);
CREATE INDEX idx_repair_orders_created ON repair_orders(created_at DESC);
