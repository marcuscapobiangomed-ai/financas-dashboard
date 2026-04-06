-- Financas Dashboard — Supabase Schema
-- Execute este SQL no SQL Editor do Supabase (supabase.com → SQL Editor → New query)

-- ============================================================
-- 1. TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('income', 'expense')) NOT NULL,
  section text NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  category text NOT NULL,
  date date NOT NULL,
  month_key text NOT NULL,
  is_recurring boolean DEFAULT false,
  recurring_id uuid,
  note text,
  tags text[],
  installment_group_id uuid,
  installment_current integer,
  installment_total integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_month ON transactions(user_id, month_key);
CREATE INDEX idx_transactions_installment_group ON transactions(installment_group_id)
  WHERE installment_group_id IS NOT NULL;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. RECURRING TEMPLATES
-- ============================================================
CREATE TABLE recurring_templates (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  category text NOT NULL,
  section text NOT NULL,
  is_active boolean DEFAULT true,
  start_month text NOT NULL,
  end_month text,
  installment_total integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring_templates" ON recurring_templates
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. EXTRAORDINARY ENTRIES
-- ============================================================
CREATE TABLE extraordinary_entries (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('ferias', 'plr', 'decimo_terceiro', 'bonus', 'outro')) NOT NULL,
  gross_amount numeric(12,2) NOT NULL,
  tithe_percent numeric(5,2) NOT NULL,
  offering_percent numeric(5,2) NOT NULL,
  tithe numeric(12,2) NOT NULL,
  offering numeric(12,2) NOT NULL,
  net_amount numeric(12,2) NOT NULL,
  month_key text NOT NULL,
  description text
);

ALTER TABLE extraordinary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own extraordinary_entries" ON extraordinary_entries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. INVESTMENTS
-- ============================================================
CREATE TABLE investments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  principal numeric(12,2) NOT NULL,
  monthly_yield_percent numeric(8,4) NOT NULL,
  start_month text NOT NULL,
  is_active boolean DEFAULT true,
  notes text,
  investment_type text DEFAULT 'manual',
  cdi_percent numeric(8,4),
  ipca_percent numeric(8,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own investments" ON investments
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. MONTH SETTINGS
-- ============================================================
CREATE TABLE month_settings (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_key text NOT NULL,
  is_closed boolean DEFAULT false,
  notes text,
  section_limits jsonb NOT NULL DEFAULT '{}',
  tithe_percent numeric(5,2) NOT NULL DEFAULT 10,
  offering_percent numeric(5,2) NOT NULL DEFAULT 2,
  savings_goal numeric(12,2),
  PRIMARY KEY (user_id, month_key)
);

ALTER TABLE month_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own month_settings" ON month_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. USER SETTINGS (app preferences, 1 row per user)
-- ============================================================
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_section_limits jsonb NOT NULL DEFAULT '{"entradas":0,"despesas_fixas":1000,"gastos_diarios":1500,"cartao_x":500,"cartao_y":500,"extraordinario":0}',
  default_tithe_percent numeric(5,2) NOT NULL DEFAULT 10,
  default_offering_percent numeric(5,2) NOT NULL DEFAULT 2,
  default_savings_goal_percent numeric(5,2) NOT NULL DEFAULT 20,
  dark_mode boolean NOT NULL DEFAULT false,
  alert_threshold_percent numeric(5,2) NOT NULL DEFAULT 80,
  card_sections jsonb NOT NULL DEFAULT '[{"id":"cartao_x","label":"Cartao X"},{"id":"cartao_y","label":"Cartao Y"}]',
  initial_balance numeric(12,2) NOT NULL DEFAULT 0,
  cdi_rate_annual numeric(8,4) NOT NULL DEFAULT 14.15,
  ipca_rate_annual numeric(8,4) NOT NULL DEFAULT 5.0
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. TRIGGER: auto-create user_settings on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 8. PUSH SUBSCRIPTIONS (Web Push notifications)
-- ============================================================
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push_subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
