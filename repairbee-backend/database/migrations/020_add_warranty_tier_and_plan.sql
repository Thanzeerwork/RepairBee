-- Migration 020: Add warranty_tier and warranty_amount to repair_orders

ALTER TABLE repair_orders 
  ADD COLUMN IF NOT EXISTS warranty_tier VARCHAR(50) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS warranty_amount DECIMAL(10, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_repair_orders_warranty_tier ON repair_orders(warranty_tier);
