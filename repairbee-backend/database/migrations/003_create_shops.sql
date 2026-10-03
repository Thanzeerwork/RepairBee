-- Migration 003: Create shops table

CREATE TYPE shop_category AS ENUM ('electronics', 'appliances', 'both');

CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  shop_name VARCHAR(255) NOT NULL,
  description TEXT,
  category shop_category NOT NULL DEFAULT 'both',
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  pincode VARCHAR(10) NOT NULL,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  avg_rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  total_ratings INTEGER NOT NULL DEFAULT 0,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.1500,
  bank_account_name VARCHAR(255),
  bank_account_number VARCHAR(30),
  bank_ifsc VARCHAR(20),
  bank_name VARCHAR(100),
  opening_time TIME,
  closing_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shops_user_id ON shops(user_id);
CREATE INDEX idx_shops_category ON shops(category);
CREATE INDEX idx_shops_is_approved ON shops(is_approved);
CREATE INDEX idx_shops_lat_lng ON shops(lat, lng);
CREATE INDEX idx_shops_avg_rating ON shops(avg_rating DESC);
