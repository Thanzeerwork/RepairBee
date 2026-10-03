-- Migration 010: Create chats table

CREATE TYPE chat_type AS ENUM ('customer_shop', 'customer_partner');

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  chat_type chat_type NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_role user_role NOT NULL,
  message TEXT,
  media_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chats_order_type ON chats(order_id, chat_type);
CREATE INDEX idx_chats_order_time ON chats(order_id, chat_type, sent_at);
CREATE INDEX idx_chats_sender ON chats(sender_id);
