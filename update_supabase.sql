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
-- Colunas faltantes em user_settings
-- (caso o banco tenha sido criado pelo schema.sql desatualizado)
-- ============================================================
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS has_seen_tutorial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rates_last_updated timestamptz,
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false;
