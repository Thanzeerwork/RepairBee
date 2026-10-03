-- Migration 004: Create products table

CREATE TYPE product_category AS ENUM ('electronics', 'appliances');

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category product_category NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  icon_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_products_name ON products(product_name);
