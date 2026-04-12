-- Add missing columns to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS has_seen_tutorial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rates_last_updated timestamptz,
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false;
