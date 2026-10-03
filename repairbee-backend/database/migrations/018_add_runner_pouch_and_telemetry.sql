-- Migration 018: Add tamper-evident pouch, OTPs, and GPS telemetry to repair_orders and deliveries

-- Add columns to repair_orders
ALTER TABLE repair_orders 
  ADD COLUMN IF NOT EXISTS pouch_barcode VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(6),
  ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(6),
  ADD COLUMN IF NOT EXISTS runner_id UUID REFERENCES users(id);

-- Add columns to deliveries
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS pouch_barcode VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(6),
  ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(6),
  ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS current_lng DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS pouch_image_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for quick barcode and runner lookups
CREATE INDEX IF NOT EXISTS idx_repair_orders_pouch_barcode ON repair_orders(pouch_barcode);
CREATE INDEX IF NOT EXISTS idx_deliveries_pouch_barcode ON deliveries(pouch_barcode);
CREATE INDEX IF NOT EXISTS idx_repair_orders_runner_id ON repair_orders(runner_id);
