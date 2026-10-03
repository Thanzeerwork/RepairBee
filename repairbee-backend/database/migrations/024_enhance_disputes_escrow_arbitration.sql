-- Migration 024: Enhance disputes table for Escrow Arbitration and Damaged-in-Transit Claims

-- 1. Add split_refund to resolution_type enum if not already present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum enm ON typ.oid = enm.enumtypid
    WHERE typ.typname = 'resolution_type' AND enm.enumlabel = 'split_refund'
  ) THEN
    ALTER TYPE resolution_type ADD VALUE 'split_refund';
  END IF;
END $$;

-- 2. Add columns to disputes for claim category, split amounts, pouch inspection, and transit claim details
ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS claim_type VARCHAR(50) NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS pouch_condition VARCHAR(50) NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS shop_payout_amount DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS split_percentage INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS transit_damage_claim JSONB DEFAULT '{}'::jsonb;

-- 3. Create indexes for quick claim queries
CREATE INDEX IF NOT EXISTS idx_disputes_claim_type ON disputes(claim_type);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
