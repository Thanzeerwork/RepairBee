-- Migration 017: Allow general customer support and nullable order_id in chats
ALTER TYPE chat_type ADD VALUE IF NOT EXISTS 'customer_support';
ALTER TABLE chats ALTER COLUMN order_id DROP NOT NULL;
