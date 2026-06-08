-- Migration: Add missing columns to investments and month_settings tables

-- 1. Add missing columns to investments table
ALTER TABLE investments
ADD COLUMN IF NOT EXISTS investment_type text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS cdi_percent numeric(8,4),
ADD COLUMN IF NOT EXISTS ipca_percent numeric(8,4),
ADD COLUMN IF NOT EXISTS ticker text,
ADD COLUMN IF NOT EXISTS shares numeric(12,4),
ADD COLUMN IF NOT EXISTS average_price numeric(12,2);

-- 2. Add missing columns to month_settings table
ALTER TABLE month_settings
ADD COLUMN IF NOT EXISTS highlights text[],
ADD COLUMN IF NOT EXISTS lessons text,
ADD COLUMN IF NOT EXISTS copied_from_months text[],
ADD COLUMN IF NOT EXISTS closed_at timestamptz,
ADD COLUMN IF NOT EXISTS opened_at timestamptz,
ADD COLUMN IF NOT EXISTS closed_by text;
