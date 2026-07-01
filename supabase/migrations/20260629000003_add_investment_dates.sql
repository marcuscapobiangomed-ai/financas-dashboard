-- Migration: Add start_date and end_date to investments table

ALTER TABLE investments
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;
