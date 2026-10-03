-- Migration 021: Add diagnostic_report JSONB to repair_orders

ALTER TABLE repair_orders 
  ADD COLUMN IF NOT EXISTS diagnostic_report JSONB;

CREATE INDEX IF NOT EXISTS idx_repair_orders_diagnostic_report ON repair_orders USING GIN (diagnostic_report);
