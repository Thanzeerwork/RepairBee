-- Migration 023: Create outbound_messages table for WhatsApp & SMS Notification Simulator

CREATE TABLE IF NOT EXISTS outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  order_number VARCHAR(50),
  recipient_name VARCHAR(150),
  recipient_phone VARCHAR(50) NOT NULL,
  recipient_role VARCHAR(50) NOT NULL DEFAULT 'customer',
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  template_key VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  action_buttons JSONB DEFAULT '[]'::jsonb,
  media_url TEXT,
  deep_link_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_order_id ON outbound_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_phone ON outbound_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_channel ON outbound_messages(channel);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_created ON outbound_messages(created_at DESC);
