-- Migration 011: Create ratings table

CREATE TYPE rated_entity_type AS ENUM ('shop', 'partner');

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES repair_orders(id),
  rated_by_id UUID NOT NULL REFERENCES users(id),
  entity_type rated_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One rating per entity type per order
CREATE UNIQUE INDEX idx_ratings_unique ON ratings(order_id, entity_type);
CREATE INDEX idx_ratings_entity ON ratings(entity_type, entity_id);
