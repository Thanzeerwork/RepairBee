-- Migration 025: Create Honeycomb Rewards & Scratch Cards Table

CREATE TABLE IF NOT EXISTS reward_scratch_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type VARCHAR(50) NOT NULL DEFAULT 'cashback_wallet',
  reward_amount DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(255) NOT NULL,
  is_scratched BOOLEAN NOT NULL DEFAULT FALSE,
  scratched_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  order_id UUID REFERENCES repair_orders(id) ON DELETE SET NULL,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scratch_cards_user ON reward_scratch_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_scratch_cards_scratched ON reward_scratch_cards(user_id, is_scratched);

-- Add loyalty XP and tier columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS honeycomb_xp INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(30) DEFAULT 'worker_bee';
