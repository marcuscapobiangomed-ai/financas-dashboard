-- Migration: Add is_paid column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT true;
