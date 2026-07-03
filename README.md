# Financas Dashboard

Dashboard financeiro pessoal com React, TypeScript, Vite, Supabase e suporte offline-first.

## Recursos

- Controle mensal de entradas, despesas, cartoes e gastos extraordinarios.
- Dashboard com saldo acumulado, metas, alertas e graficos.
- Lancamentos recorrentes e parcelamentos.
- Controle de investimentos e projecao de fluxo de caixa.
- Importacao inteligente de PDF, CSV e Excel `.xlsx`.
- Relatorio de IR com checklist e analises.
- Sincronizacao com Supabase, fila offline e Realtime.
- PWA com service worker em producao.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Supabase
- Recharts
- Vitest

## Configuracao

Crie um arquivo `.env.local` com base em `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

Para a rota serverless de importacao por IA, configure tambem no ambiente do deploy:

```env
GEMINI_API_KEY=your-gemini-api-key-here
GROQ_API_KEY=your-groq-api-key-here
```

`GROQ_API_KEY` e usado apenas como fallback quando Gemini nao esta disponivel.

## Scripts

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

## Supabase

O schema principal esta em `supabase/schema.sql`.

As migracoes incrementais ficam em `supabase/migrations/`.

Tabelas usam RLS para isolar dados por usuario. Antes de usar em um projeto novo, aplique o schema/migrations no Supabase e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Importacao

Formatos suportados:

- PDF
- CSV
- Excel `.xlsx`

Arquivos `.xls` legados nao sao suportados. O suporte foi removido para evitar dependencia vulneravel.

## Validacao Atual

Estado esperado dos checks:

```bash
npm run lint
npm test
npm run build
npm audit
```

Todos devem finalizar sem erros.
