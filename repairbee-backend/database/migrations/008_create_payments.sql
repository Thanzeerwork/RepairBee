-- Migration 008: Create payments table

CREATE TYPE payment_method AS ENUM ('wallet', 'upi', 'card', 'net_banking');
CREATE TYPE escrow_status AS ENUM ('pending', 'held', 'released', 'refunded');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES repair_orders(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  method payment_method NOT NULL,
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature VARCHAR(255),
  razorpay_transfer_id VARCHAR(100),
  escrow_status escrow_status NOT NULL DEFAULT 'pending',
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_escrow ON payments(escrow_status);
CREATE INDEX idx_payments_razorpay ON payments(razorpay_order_id);
