-- Migration 022: Add video_proof_vault JSONB to repair_orders

ALTER TABLE repair_orders 
  ADD COLUMN IF NOT EXISTS video_proof_vault JSONB;

CREATE INDEX IF NOT EXISTS idx_repair_orders_video_proof_vault ON repair_orders USING GIN (video_proof_vault);
