-- Migration 014: Create referrals table

CREATE TYPE referral_status AS ENUM ('pending', 'completed');

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referee_id UUID NOT NULL REFERENCES users(id),
  referral_code VARCHAR(20) NOT NULL,
  referrer_reward_amount DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  referee_discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  status referral_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON referrals(referee_id);
CREATE UNIQUE INDEX idx_referrals_referee_unique ON referrals(referee_id);
