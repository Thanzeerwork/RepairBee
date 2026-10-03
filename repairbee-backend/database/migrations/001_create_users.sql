-- Migration 001: Create users table
-- RepairBee user accounts for all roles

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('customer', 'shop_owner', 'delivery_partner', 'admin');
CREATE TYPE auth_provider AS ENUM ('email', 'google');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  auth_provider auth_provider NOT NULL DEFAULT 'email',
  role user_role NOT NULL DEFAULT 'customer',
  profile_pic_url TEXT,
  wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  referral_code VARCHAR(20) UNIQUE,
  fcm_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_phone_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_referral_code ON users(referral_code);
