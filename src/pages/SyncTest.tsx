import { useState, useCallback, useRef } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuthStore } from '../store/useAuthStore'
import { supabase } from '../lib/supabase'
import { Category } from '../types/category'

// ── Types ────────────────────────────────────────────────────────────────────

type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'skipped'

interface TestResult {
  id: string
  group: string
  name: string
  status: TestStatus
  detail?: string
  durationMs?: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TEST_PREFIX = '__SYNC_TEST__'
const TEST_MONTH = '2099-12' // far-future month to avoid collisions

/** Wait for async sync to propagate to Supabase */
function waitForSync(ms = 3000): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Generate a unique test ID */
function testId(): string {
  return crypto.randomUUID()
}

// ── Test Definitions ─────────────────────────────────────────────────────────

type TestFn = (userId: string, addResult: (r: Partial<TestResult>) => void) => Promise<void>

interface TestDef {
  id: string
  group: string
  name: string
  fn: TestFn
}

const tests: TestDef[] = [
  // ── TRANSACTIONS ───────────────────────────────────────────────────────────

  {
    id: 'tx-add',
    group: 'Transações',
    name: 'Adicionar transação (receita)',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const before = store.transactions.length
      store.addTransaction({
        type: 'income',
        section: 'entradas',
        description: `${TEST_PREFIX} Salário Teste`,
        amount: 5000,
        category: Category.ENTRADAS,
        date: `${TEST_MONTH}-01`,
        monthKey: TEST_MONTH,
      })
      const after = useFinanceStore.getState().transactions.length
      if (after !== before + 1) throw new Error(`Store: esperado ${before + 1} transações, obteve ${after}`)

      await waitForSync()

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .like('description', `${TEST_PREFIX}%`)
        .eq('description', `${TEST_PREFIX} Salário Teste`)
      if (error) throw new Error(`Supabase read error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('Transação NÃO encontrada no Supabase')
      addResult({ detail: `✓ Store OK (${after} items) | Supabase OK (${data.length} row)` })
    },
  },

  {
    id: 'tx-add-expense',
    group: 'Transações',
    name: 'Adicionar transação (despesa)',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      store.addTransaction({
        type: 'expense',
        section: 'despesas_fixas',
        description: `${TEST_PREFIX} Aluguel Teste`,
        amount: 1500,
        category: Category.MORADIA,
        date: `${TEST_MONTH}-05`,
        monthKey: TEST_MONTH,
      })

      await waitForSync()

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('description', `${TEST_PREFIX} Aluguel Teste`)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('Despesa NÃO encontrada no Supabase')
      if (data[0].amount !== 1500) throw new Error(`Valor errado: esperado 1500, obteve ${data[0].amount}`)
      if (data[0].section !== 'despesas_fixas') throw new Error(`Seção errada: ${data[0].section}`)
      addResult({ detail: `✓ amount=${data[0].amount} | section=${data[0].section} | category=${data[0].category}` })
    },
  },

  {
    id: 'tx-update',
    group: 'Transações',
    name: 'Atualizar transação (valor + descrição)',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const tx = store.transactions.find((t) => t.description === `${TEST_PREFIX} Aluguel Teste`)
      if (!tx) throw new Error('Transação de teste não encontrada no store')

      store.updateTransaction(tx.id, {
        amount: 1800,
        description: `${TEST_PREFIX} Aluguel Atualizado`,
        category: Category.MORADIA,
      })

      await waitForSync()

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', tx.id)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('Transação não encontrada no Supabase após update')
      if (data[0].amount !== 1800) throw new Error(`Valor não atualizado: ${data[0].amount}`)
      if (data[0].description !== `${TEST_PREFIX} Aluguel Atualizado`)
        throw new Error(`Descrição não atualizada: ${data[0].description}`)
      addResult({ detail: `✓ Valor: 1500→1800 | Descrição atualizada` })
    },
  },

  {
    id: 'tx-bulk-add',
    group: 'Transações',
    name: 'Adicionar múltiplas transações (bulk)',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const bulkTxs = [
        {
          id: testId(), type: 'expense' as const, section: 'gastos_diarios',
          description: `${TEST_PREFIX} Bulk1`, amount: 50,
          category: Category.SUPERMERCADO, date: `${TEST_MONTH}-10`,
          monthKey: TEST_MONTH, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        },
        {
          id: testId(), type: 'expense' as const, section: 'gastos_diarios',
          description: `${TEST_PREFIX} Bulk2`, amount: 75,
          category: Category.RESTAURANTE, date: `${TEST_MONTH}-11`,
          monthKey: TEST_MONTH, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        },
        {
          id: testId(), type: 'expense' as const, section: 'gastos_diarios',
          description: `${TEST_PREFIX} Bulk3`, amount: 120,
          category: Category.TRANSPORTE, date: `${TEST_MONTH}-12`,
          monthKey: TEST_MONTH, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        },
      ]
      store.addTransactions(bulkTxs)

      await waitForSync()

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .like('description', `${TEST_PREFIX} Bulk%`)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length < 3) throw new Error(`Esperado 3 bulk items, encontrado ${data?.length ?? 0}`)
      addResult({ detail: `✓ ${data.length} transações em bulk salvas no Supabase` })
    },
  },

  {
    id: 'tx-bulk-update',
    group: 'Transações',
    name: 'Atualizar múltiplas transações (bulk)',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const bulkTxs = store.transactions.filter((t) => t.description.startsWith(`${TEST_PREFIX} Bulk`))
      if (bulkTxs.length < 2) throw new Error('Poucos itens bulk para testar')

      const ids = bulkTxs.map((t) => t.id)
      store.bulkUpdateTransactions(ids, { category: Category.LAZER })

      await waitForSync()

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .in('id', ids)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      const allUpdated = data?.every((r) => r.category === Category.LAZER)
      if (!allUpdated) throw new Error('Nem todas as transações tiveram a categoria atualizada')
      addResult({ detail: `✓ ${data?.length} transações bulk atualizadas para LAZER` })
    },
  },

  {
    id: 'tx-delete',
    group: 'Transações',
    name: 'Deletar transação',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const tx = store.transactions.find((t) => t.description === `${TEST_PREFIX} Salário Teste`)
      if (!tx) throw new Error('Transação de teste não encontrada')

      store.deleteTransaction(tx.id)

      await waitForSync()

      const { data, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('id', tx.id)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (data && data.length > 0) throw new Error('Transação ainda existe no Supabase após delete')
      addResult({ detail: `✓ Transação ${tx.id.slice(0, 8)}... removida do Supabase` })
    },
  },

  // ── RECURRING TEMPLATES ────────────────────────────────────────────────────

  {
    id: 'rec-add',
    group: 'Recorrentes',
    name: 'Adicionar template recorrente',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const id = store.addRecurringTemplate({
        description: `${TEST_PREFIX} Internet Mensal`,
        amount: 120,
        category: Category.SERVICOS,
        section: 'despesas_fixas',
        isActive: true,
        startMonth: TEST_MONTH,
      })

      await waitForSync()

      const { data, error } = await supabase
        .from('recurring_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('description', `${TEST_PREFIX} Internet Mensal`)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('Template recorrente NÃO encontrado no Supabase')
      if (data[0].amount !== 120) throw new Error(`Valor errado: ${data[0].amount}`)
      addResult({ detail: `✓ Template id=${id.slice(0, 8)}... | amount=120 | section=despesas_fixas` })
    },
  },

  {
    id: 'rec-update',
    group: 'Recorrentes',
    name: 'Atualizar template recorrente',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const tmpl = store.recurringTemplates.find((t) => t.description === `${TEST_PREFIX} Internet Mensal`)
      if (!tmpl) throw new Error('Template não encontrado')

      store.updateRecurringTemplate(tmpl.id, { amount: 150, description: `${TEST_PREFIX} Internet Atualizada` })

      await waitForSync()

      const { data, error } = await supabase
        .from('recurring_templates')
        .select('*')
        .eq('id', tmpl.id)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('Template não encontrado após update')
      if (data[0].amount !== 150) throw new Error(`Valor não atualizado: ${data[0].amount}`)
      addResult({ detail: `✓ Valor: 120→150 | Descrição atualizada` })
    },
  },

  {
    id: 'rec-delete',
    group: 'Recorrentes',
    name: 'Deletar template recorrente',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const tmpl = store.recurringTemplates.find((t) => t.description.startsWith(`${TEST_PREFIX}`))
      if (!tmpl) throw new Error('Template não encontrado')
      const id = tmpl.id

      store.deleteRecurringTemplate(id)

      await waitForSync()

      const { data, error } = await supabase
        .from('recurring_templates')
        .select('id')
        .eq('id', id)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (data && data.length > 0) throw new Error('Template ainda existe no Supabase')
      addResult({ detail: `✓ Template removido do Supabase` })
    },
  },

  // ── EXTRAORDINARY ENTRIES ──────────────────────────────────────────────────

  {
    id: 'extra-add',
    group: 'Extraordinárias',
    name: 'Adicionar entrada extraordinária',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      store.addExtraordinary({
        type: 'bonus',
        grossAmount: 3000,
        tithePercent: 10,
        offeringPercent: 2,
        tithe: 300,
        offering: 60,
        netAmount: 2640,
        monthKey: TEST_MONTH,
        description: `${TEST_PREFIX} Bônus Teste`,
      })

      await waitForSync()

      const { data, error } = await supabase
        .from('extraordinary_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('description', `${TEST_PREFIX} Bônus Teste`)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('Entrada extraordinária NÃO encontrada no Supabase')
      if (Number(data[0].gross_amount) !== 3000) throw new Error(`Valor bruto errado: ${data[0].gross_amount}`)
      if (Number(data[0].net_amount) !== 2640) throw new Error(`Valor líquido errado: ${data[0].net_amount}`)
      addResult({ detail: `✓ Bruto=3000 | Líquido=2640 | Dízimo=300 | Oferta=60` })
    },
  },

  {
    id: 'extra-delete',
    group: 'Extraordinárias',
    name: 'Deletar entrada extraordinária',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const entry = store.extraordinaryEntries.find((e) => e.description === `${TEST_PREFIX} Bônus Teste`)
      if (!entry) throw new Error('Entrada extraordinária não encontrada')
      const id = entry.id

      store.deleteExtraordinary(id)

      await waitForSync()

      const { data, error } = await supabase
        .from('extraordinary_entries')
        .select('id')
        .eq('id', id)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (data && data.length > 0) throw new Error('Entrada ainda existe no Supabase')
      addResult({ detail: `✓ Entrada extraordinária removida do Supabase` })
    },
  },

  // ── INVESTMENTS ────────────────────────────────────────────────────────────

  {
    id: 'inv-add',
    group: 'Investimentos',
    name: 'Adicionar investimento (CDB)',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      store.addInvestment({
        name: `${TEST_PREFIX} CDB Teste`,
        principal: 10000,
        monthlyYieldPercent: 1.1,
        startMonth: TEST_MONTH,
        isActive: true,
        investmentType: 'cdb',
        cdiPercent: 110,
        notes: 'Investimento de teste',
      })

      await waitForSync()

      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .eq('name', `${TEST_PREFIX} CDB Teste`)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('Investimento NÃO encontrado no Supabase')
      if (Number(data[0].principal) !== 10000) throw new Error(`Principal errado: ${data[0].principal}`)
      addResult({ detail: `✓ Principal=10000 | Tipo=CDB | CDI=110%` })
    },
  },

  {
    id: 'inv-update',
    group: 'Investimentos',
    name: 'Atualizar investimento (principal)',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const inv = store.investments.find((i) => i.name === `${TEST_PREFIX} CDB Teste`)
      if (!inv) throw new Error('Investimento não encontrado')

      store.updateInvestment(inv.id, { principal: 15000, notes: 'Aporte adicional' })

      await waitForSync()

      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('id', inv.id)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('Investimento não encontrado após update')
      if (Number(data[0].principal) !== 15000) throw new Error(`Principal não atualizado: ${data[0].principal}`)
      addResult({ detail: `✓ Principal: 10000→15000 | Notes atualizado` })
    },
  },

  {
    id: 'inv-delete',
    group: 'Investimentos',
    name: 'Deletar investimento',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const inv = store.investments.find((i) => i.name === `${TEST_PREFIX} CDB Teste`)
      if (!inv) throw new Error('Investimento não encontrado')
      const id = inv.id

      store.deleteInvestment(id)

      await waitForSync()

      const { data, error } = await supabase
        .from('investments')
        .select('id')
        .eq('id', id)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (data && data.length > 0) throw new Error('Investimento ainda existe no Supabase')
      addResult({ detail: `✓ Investimento removido do Supabase` })
    },
  },

  // ── MONTH SETTINGS ─────────────────────────────────────────────────────────

  {
    id: 'ms-update-limits',
    group: 'Config. do Mês',
    name: 'Atualizar limites do mês',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      store.updateMonthSettings(TEST_MONTH, {
        sectionLimits: { entradas: 0, despesas_fixas: 2000, gastos_diarios: 3000 },
      })

      await waitForSync(4000) // debounced — needs extra time

      const { data, error } = await supabase
        .from('month_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('month_key', TEST_MONTH)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('MonthSettings NÃO encontrado no Supabase')
      const limits = data[0].section_limits
      if (limits.despesas_fixas !== 2000) throw new Error(`Limite despesas_fixas errado: ${limits.despesas_fixas}`)
      if (limits.gastos_diarios !== 3000) throw new Error(`Limite gastos_diarios errado: ${limits.gastos_diarios}`)
      addResult({ detail: `✓ Limites: despesas_fixas=2000 | gastos_diarios=3000` })
    },
  },

  {
    id: 'ms-update-notes',
    group: 'Config. do Mês',
    name: 'Atualizar notas e destaques do mês',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      store.updateMonthSettings(TEST_MONTH, {
        notes: `${TEST_PREFIX} Notas de teste do mês`,
        highlights: ['Destaque 1', 'Destaque 2'],
        lessons: 'Lições aprendidas no teste',
      })

      await waitForSync(4000)

      const { data, error } = await supabase
        .from('month_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('month_key', TEST_MONTH)
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (!data || data.length === 0) throw new Error('MonthSettings não encontrado')
      if (!data[0].notes?.includes(TEST_PREFIX)) throw new Error('Notas não salvas')
      if (!data[0].highlights || data[0].highlights.length !== 2) throw new Error(`Highlights errados: ${JSON.stringify(data[0].highlights)}`)
      if (!data[0].lessons) throw new Error('Lições não salvas')
      addResult({ detail: `✓ Notas OK | ${data[0].highlights.length} highlights | Lições OK` })
    },
  },

  {
    id: 'ms-toggle-closed',
    group: 'Config. do Mês',
    name: 'Fechar/Abrir mês (toggle)',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      // Close
      store.updateMonthSettings(TEST_MONTH, { isClosed: true })

      await waitForSync(4000)

      const { data: d1, error: e1 } = await supabase
        .from('month_settings')
        .select('is_closed')
        .eq('user_id', userId)
        .eq('month_key', TEST_MONTH)
        .single()
      if (e1) throw new Error(`Supabase error: ${e1.message}`)
      if (!d1?.is_closed) throw new Error('Mês não foi fechado no Supabase')

      // Re-open
      store.updateMonthSettings(TEST_MONTH, { isClosed: false })
      await waitForSync(4000)

      const { data: d2, error: e2 } = await supabase
        .from('month_settings')
        .select('is_closed')
        .eq('user_id', userId)
        .eq('month_key', TEST_MONTH)
        .single()
      if (e2) throw new Error(`Supabase error: ${e2.message}`)
      if (d2?.is_closed) throw new Error('Mês não foi reaberto no Supabase')
      addResult({ detail: `✓ Fechou (is_closed=true) → Reabriu (is_closed=false)` })
    },
  },

  {
    id: 'ms-savings-goal',
    group: 'Config. do Mês',
    name: 'Atualizar meta de poupança do mês',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      store.updateMonthSettings(TEST_MONTH, { savingsGoal: 25 })

      await waitForSync(4000)

      const { data, error } = await supabase
        .from('month_settings')
        .select('savings_goal')
        .eq('user_id', userId)
        .eq('month_key', TEST_MONTH)
        .single()
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (Number(data?.savings_goal) !== 25) throw new Error(`Meta errada: ${data?.savings_goal}`)
      addResult({ detail: `✓ Meta de poupança = 25%` })
    },
  },

  // ── APP SETTINGS ───────────────────────────────────────────────────────────

  {
    id: 'as-dark-mode',
    group: 'Config. do App',
    name: 'Alterar dark mode',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const original = store.appSettings.darkMode
      store.updateAppSettings({ darkMode: !original })

      await waitForSync(4000)

      const { data, error } = await supabase
        .from('user_settings')
        .select('dark_mode')
        .eq('user_id', userId)
        .single()
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (data?.dark_mode !== !original) throw new Error(`Dark mode não atualizado: ${data?.dark_mode}`)

      // Restore original
      store.updateAppSettings({ darkMode: original })
      await waitForSync(2000)

      addResult({ detail: `✓ darkMode: ${original}→${!original}→${original} (restaurado)` })
    },
  },

  {
    id: 'as-tithe-percent',
    group: 'Config. do App',
    name: 'Alterar % dízimo padrão',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const original = store.appSettings.defaultTithePercent
      store.updateAppSettings({ defaultTithePercent: 15 })

      await waitForSync(4000)

      const { data, error } = await supabase
        .from('user_settings')
        .select('default_tithe_percent')
        .eq('user_id', userId)
        .single()
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (Number(data?.default_tithe_percent) !== 15) throw new Error(`Dízimo não atualizado: ${data?.default_tithe_percent}`)

      // Restore
      store.updateAppSettings({ defaultTithePercent: original })
      await waitForSync(2000)

      addResult({ detail: `✓ Dízimo: ${original}%→15%→${original}% (restaurado)` })
    },
  },

  {
    id: 'as-offering-percent',
    group: 'Config. do App',
    name: 'Alterar % oferta padrão',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const original = store.appSettings.defaultOfferingPercent
      store.updateAppSettings({ defaultOfferingPercent: 5 })

      await waitForSync(4000)

      const { data, error } = await supabase
        .from('user_settings')
        .select('default_offering_percent')
        .eq('user_id', userId)
        .single()
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (Number(data?.default_offering_percent) !== 5) throw new Error(`Oferta não atualizada: ${data?.default_offering_percent}`)

      store.updateAppSettings({ defaultOfferingPercent: original })
      await waitForSync(2000)

      addResult({ detail: `✓ Oferta: ${original}%→5%→${original}% (restaurado)` })
    },
  },

  {
    id: 'as-limits',
    group: 'Config. do App',
    name: 'Alterar limites padrão de seções',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const original = { ...store.appSettings.defaultSectionLimits }
      store.updateAppSettings({
        defaultSectionLimits: { ...original, despesas_fixas: 9999, gastos_diarios: 8888 },
      })

      await waitForSync(4000)

      const { data, error } = await supabase
        .from('user_settings')
        .select('default_section_limits')
        .eq('user_id', userId)
        .single()
      if (error) throw new Error(`Supabase error: ${error.message}`)
      const limits = data?.default_section_limits
      if (limits?.despesas_fixas !== 9999) throw new Error(`Limite despesas_fixas: ${limits?.despesas_fixas}`)
      if (limits?.gastos_diarios !== 8888) throw new Error(`Limite gastos_diarios: ${limits?.gastos_diarios}`)

      store.updateAppSettings({ defaultSectionLimits: original })
      await waitForSync(2000)

      addResult({ detail: `✓ Limites atualizados e restaurados` })
    },
  },

  {
    id: 'as-initial-balance',
    group: 'Config. do App',
    name: 'Alterar saldo inicial',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const original = store.appSettings.initialBalance
      store.updateAppSettings({ initialBalance: 12345.67 })

      await waitForSync(4000)

      const { data, error } = await supabase
        .from('user_settings')
        .select('initial_balance')
        .eq('user_id', userId)
        .single()
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (Number(data?.initial_balance) !== 12345.67) throw new Error(`Saldo não atualizado: ${data?.initial_balance}`)

      store.updateAppSettings({ initialBalance: original })
      await waitForSync(2000)

      addResult({ detail: `✓ Saldo: ${original}→12345.67→${original} (restaurado)` })
    },
  },

  {
    id: 'as-alert-threshold',
    group: 'Config. do App',
    name: 'Alterar threshold de alerta',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const original = store.appSettings.alertThresholdPercent
      store.updateAppSettings({ alertThresholdPercent: 90 })

      await waitForSync(4000)

      const { data, error } = await supabase
        .from('user_settings')
        .select('alert_threshold_percent')
        .eq('user_id', userId)
        .single()
      if (error) throw new Error(`Supabase error: ${error.message}`)
      if (Number(data?.alert_threshold_percent) !== 90) throw new Error(`Threshold não atualizado: ${data?.alert_threshold_percent}`)

      store.updateAppSettings({ alertThresholdPercent: original })
      await waitForSync(2000)

      addResult({ detail: `✓ Threshold: ${original}→90→${original} (restaurado)` })
    },
  },

  {
    id: 'as-card-sections',
    group: 'Config. do App',
    name: 'Adicionar/remover cartão (cardSections)',
    fn: async (userId, addResult) => {
      const store = useFinanceStore.getState()
      const original = [...(store.appSettings.cardSections ?? [])]
      const testCard = { id: `${TEST_PREFIX}_cartao`, label: 'Cartão Teste', closingDay: 15, dueDay: 25 }
      store.updateAppSettings({ cardSections: [...original, testCard] })

      await waitForSync(4000)

      const { data, error } = await supabase
        .from('user_settings')
        .select('card_sections')
        .eq('user_id', userId)
        .single()
      if (error) throw new Error(`Supabase error: ${error.message}`)
      const cards = data?.card_sections
      const found = cards?.find((c: any) => c.id === testCard.id)
      if (!found) throw new Error('Cartão teste não encontrado no Supabase')
      if ((found.closingDay ?? found.closing_day) !== 15) throw new Error('Closing day errado')

      // Restore
      store.updateAppSettings({ cardSections: original })
      await waitForSync(2000)

      addResult({ detail: `✓ Cartão adicionado (fechamento=15, vencimento=25) e removido` })
    },
  },

  // ── SYNC STATUS ────────────────────────────────────────────────────────────

  {
    id: 'sync-status-check',
    group: 'Sync Status',
    name: 'Verificar status do sync após todas as operações',
    fn: async (_userId, addResult) => {
      const store = useFinanceStore.getState()
      const { syncStatus, syncError, syncQueue } = store
      if (syncStatus === 'error') throw new Error(`Sync em estado de ERRO: ${syncError}`)
      if (syncQueue.length > 0) throw new Error(`Fila de sync não vazia: ${syncQueue.length} items pendentes`)
      addResult({ detail: `✓ Status=${syncStatus} | Erro=${syncError ?? 'nenhum'} | Fila=${syncQueue.length}` })
    },
  },

  // ── CLEANUP ────────────────────────────────────────────────────────────────

  {
    id: 'cleanup',
    group: 'Limpeza',
    name: 'Remover todos os dados de teste do Supabase',
    fn: async (userId, addResult) => {
      // Delete test transactions from store
      const store = useFinanceStore.getState()
      const testTxs = store.transactions.filter((t) => t.description.startsWith(TEST_PREFIX))
      for (const tx of testTxs) {
        store.deleteTransaction(tx.id)
      }

      await waitForSync(2000)

      // Direct cleanup from Supabase (safety net)
      const results = await Promise.all([
        supabase.from('transactions').delete().eq('user_id', userId).like('description', `${TEST_PREFIX}%`),
        supabase.from('recurring_templates').delete().eq('user_id', userId).like('description', `${TEST_PREFIX}%`),
        supabase.from('extraordinary_entries').delete().eq('user_id', userId).like('description', `${TEST_PREFIX}%`),
        supabase.from('investments').delete().eq('user_id', userId).like('name', `${TEST_PREFIX}%`),
        supabase.from('month_settings').delete().eq('user_id', userId).eq('month_key', TEST_MONTH),
      ])

      const errors = results.filter((r) => r.error)
      if (errors.length > 0) {
        addResult({ detail: `⚠️ Limpeza com ${errors.length} erro(s): ${errors.map((e) => e.error?.message).join(', ')}` })
      } else {
        addResult({ detail: `✓ Todos os dados de teste removidos (${testTxs.length} transações locais + Supabase limpo)` })
      }
    },
  },
]

// ── Component ────────────────────────────────────────────────────────────────

export function SyncTest() {
  const userId = useAuthStore((s) => s.user?.id)
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const abortRef = useRef(false)

  const updateResult = useCallback((id: string, update: Partial<TestResult>) => {
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...update } : r))
    )
  }, [])

  const runAllTests = useCallback(async () => {
    if (!userId) return
    abortRef.current = false
    setRunning(true)

    // Initialize all results
    const initial: TestResult[] = tests.map((t) => ({
      id: t.id,
      group: t.group,
      name: t.name,
      status: 'pending' as const,
    }))
    setResults(initial)

    for (const test of tests) {
      if (abortRef.current) {
        setResults((prev) =>
          prev.map((r) => (r.status === 'pending' ? { ...r, status: 'skipped' as const } : r))
        )
        break
      }

      setCurrentTest(test.name)
      setResults((prev) =>
        prev.map((r) => (r.id === test.id ? { ...r, status: 'running' as const } : r))
      )

      const startTime = performance.now()
      try {
        await test.fn(userId, (partial) => {
          updateResult(test.id, partial)
        })
        const duration = Math.round(performance.now() - startTime)
        updateResult(test.id, { status: 'pass', durationMs: duration })
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime)
        updateResult(test.id, {
          status: 'fail',
          detail: `❌ ${err.message}`,
          durationMs: duration,
        })
      }
    }

    setCurrentTest(null)
    setRunning(false)
  }, [userId, updateResult])

  const abort = useCallback(() => {
    abortRef.current = true
  }, [])

  // Summary
  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  const pending = results.filter((r) => r.status === 'pending' || r.status === 'running').length
  const skipped = results.filter((r) => r.status === 'skipped').length

  // Group results
  const groups: Record<string, TestResult[]> = {}
  for (const r of results) {
    if (!groups[r.group]) groups[r.group] = []
    groups[r.group].push(r)
  }

  if (!userId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-500">⚠️ Faça login primeiro</h1>
        <p className="text-gray-500 mt-2">Os testes precisam de um usuário autenticado para verificar o Supabase.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          🧪 Teste de Sincronização Supabase
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Testa cada operação do app e verifica se o Supabase salvou corretamente.
          Dados de teste usam o prefixo <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{TEST_PREFIX}</code> e
          mês <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{TEST_MONTH}</code> para evitar conflitos.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={runAllTests}
          disabled={running}
          className={`px-6 py-2.5 rounded-xl font-semibold text-white transition-all cursor-pointer ${
            running
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {running ? '⏳ Executando...' : '▶ Executar Todos os Testes'}
        </button>

        {running && (
          <button
            onClick={abort}
            className="px-4 py-2.5 rounded-xl font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-all cursor-pointer"
          >
            ⏹ Abortar
          </button>
        )}

        {results.length > 0 && !running && (
          <div className="ml-auto flex items-center gap-4 text-sm font-medium">
            <span className="text-green-600">✅ {passed}</span>
            <span className="text-red-600">❌ {failed}</span>
            {skipped > 0 && <span className="text-gray-400">⏭ {skipped}</span>}
            <span className="text-gray-500">Total: {results.length}</span>
          </div>
        )}
      </div>

      {/* Overall status bar */}
      {results.length > 0 && (
        <div className="mb-6">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            {passed > 0 && (
              <div className="bg-green-500 transition-all duration-500" style={{ width: `${(passed / results.length) * 100}%` }} />
            )}
            {failed > 0 && (
              <div className="bg-red-500 transition-all duration-500" style={{ width: `${(failed / results.length) * 100}%` }} />
            )}
            {pending > 0 && (
              <div className="bg-indigo-400 animate-pulse transition-all duration-500" style={{ width: `${(pending / results.length) * 100}%` }} />
            )}
            {skipped > 0 && (
              <div className="bg-gray-400 transition-all duration-500" style={{ width: `${(skipped / results.length) * 100}%` }} />
            )}
          </div>
          {currentTest && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2 animate-pulse">
              ⏳ Executando: {currentTest}
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="mb-4">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            {group}
            <span className="text-xs font-normal">
              ({items.filter((i) => i.status === 'pass').length}/{items.length})
            </span>
          </h2>
          <div className="space-y-1.5">
            {items.map((r) => (
              <div
                key={r.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  r.status === 'pass'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : r.status === 'fail'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : r.status === 'running'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 animate-pulse'
                    : r.status === 'skipped'
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50'
                    : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className="text-lg mt-0.5">
                  {r.status === 'pass' && '✅'}
                  {r.status === 'fail' && '❌'}
                  {r.status === 'running' && '⏳'}
                  {r.status === 'pending' && '⬜'}
                  {r.status === 'skipped' && '⏭'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${
                      r.status === 'fail' ? 'text-red-800 dark:text-red-300' : 'dark:text-white'
                    }`}>
                      {r.name}
                    </span>
                    {r.durationMs != null && (
                      <span className="text-xs text-gray-400">{(r.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  {r.detail && (
                    <p className={`text-xs mt-0.5 break-all ${
                      r.status === 'fail'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {r.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {results.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-4">🧪</p>
          <p className="text-lg">Clique em <strong>"Executar Todos os Testes"</strong> para iniciar</p>
          <p className="text-sm mt-2">
            São {tests.length} testes cobrindo transações, recorrentes, extraordinárias,
            investimentos, configurações do mês e do app.
          </p>
        </div>
      )}
    </div>
  )
}
