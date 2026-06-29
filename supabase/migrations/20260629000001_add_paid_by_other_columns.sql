-- Migration: Add paid_by_other and paid_by_name columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS paid_by_other boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_by_name text;