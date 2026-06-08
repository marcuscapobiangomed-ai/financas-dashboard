-- Add missing columns to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS cdi_rate_annual numeric(8,4) NOT NULL DEFAULT 14.15,
ADD COLUMN IF NOT EXISTS ipca_rate_annual numeric(8,4) NOT NULL DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS has_seen_tutorial boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS rates_last_updated timestamptz,
ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT false;
