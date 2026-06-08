-- Migration: Add gemini_api_key column to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS gemini_api_key text;
