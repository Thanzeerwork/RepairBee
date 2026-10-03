-- Migration 015: Create withdrawals table

CREATE TYPE withdrawal_status AS ENUM ('pending', 'processed', 'failed');

CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  user_role user_role NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  bank_account_name VARCHAR(255),
  bank_account_number VARCHAR(30),
  bank_ifsc VARCHAR(20),
  bank_name VARCHAR(100),
  status withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  processed_by_id UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
