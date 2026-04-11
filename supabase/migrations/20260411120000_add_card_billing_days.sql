-- Migration: Add closingDay and dueDay to card_sections in user_settings
-- These fields are stored inside the card_sections JSONB array
-- This migration adds default values (closingDay: 10, dueDay: 20) to existing cards

UPDATE user_settings
SET card_sections = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'closingDay' IS NULL 
      THEN elem || '{"closingDay": 10, "dueDay": 20}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(card_sections) AS elem
)
WHERE card_sections IS NOT NULL
  AND jsonb_array_length(card_sections) > 0;
