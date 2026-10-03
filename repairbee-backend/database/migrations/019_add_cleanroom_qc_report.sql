-- Migration 019: Add cleanroom_qc_report to repair_orders

ALTER TABLE repair_orders 
  ADD COLUMN IF NOT EXISTS qc_report JSONB;

CREATE INDEX IF NOT EXISTS idx_repair_orders_qc_report ON repair_orders USING GIN (qc_report);
