-- 1. Habilitar Realtime para month_settings
ALTER PUBLICATION supabase_realtime ADD TABLE month_settings;

-- 2. Adicionar colunas faltantes em user_settings (caso o banco tenha sido criado pelo schema.sql desatualizado)
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS has_seen_tutorial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rates_last_updated timestamptz,
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false;
