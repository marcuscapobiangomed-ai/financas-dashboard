-- ============================================================
-- Habilitar Realtime para TODAS as tabelas financeiras
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- (Usando bloco DO para não falhar se a tabela já estiver adicionada)
-- ============================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'transactions', 
    'recurring_templates', 
    'extraordinary_entries', 
    'investments', 
    'month_settings', 
    'user_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END
$$;

-- ============================================================
-- Colunas faltantes nas tabelas do Supabase
-- (caso o banco remoto tenha sido criado por esquemas antigos)
-- ============================================================

-- 1. Tabela user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS cdi_rate_annual numeric(8,4) NOT NULL DEFAULT 14.15,
ADD COLUMN IF NOT EXISTS ipca_rate_annual numeric(8,4) NOT NULL DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS has_seen_tutorial boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS rates_last_updated timestamptz,
ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT false;

-- 2. Tabela investments
ALTER TABLE investments
ADD COLUMN IF NOT EXISTS investment_type text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS cdi_percent numeric(8,4),
ADD COLUMN IF NOT EXISTS ipca_percent numeric(8,4),
ADD COLUMN IF NOT EXISTS ticker text,
ADD COLUMN IF NOT EXISTS shares numeric(12,4),
ADD COLUMN IF NOT EXISTS average_price numeric(12,2);

-- 3. Tabela month_settings
ALTER TABLE month_settings
ADD COLUMN IF NOT EXISTS highlights text[],
ADD COLUMN IF NOT EXISTS lessons text,
ADD COLUMN IF NOT EXISTS copied_from_months text[],
ADD COLUMN IF NOT EXISTS closed_at timestamptz,
ADD COLUMN IF NOT EXISTS opened_at timestamptz,
ADD COLUMN IF NOT EXISTS closed_by text;

