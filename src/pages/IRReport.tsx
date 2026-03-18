import { useState, useMemo, useRef } from 'react'
import {
  FileText, Download, ChevronDown, ChevronUp,
  AlertTriangle, Info, Building2, Landmark, ShieldCheck, Heart, Briefcase, Printer,
} from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { getInvestmentMeta } from '../constants/investmentTypes'
import { daysSinceStartMonth, netYieldAfterIR } from '../utils/investmentCalc'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const EXTRAORDINARY_LABELS: Record<string, string> = {
  ferias: 'Férias',
  plr: 'PLR',
  decimo_terceiro: '13° Salário',
  bonus: 'Bônus',
  outro: 'Outros',
}

interface SectionProps {
  id: string
  title: string
  icon: React.ReactNode
  total: number
  expanded: boolean
  onToggle: () => void
  badge?: string
  badgeColor?: string
  children: React.ReactNode
}

function ReportSection({ id, title, icon, total, expanded, onToggle, badge, badgeColor, children }: SectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
            {badge && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeColor ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                {badge}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mr-2">{fmt(total)}</p>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-50 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  )
}

function LineItem({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div>
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        {sub && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{sub}</span>}
      </div>
      <span className="font-medium text-gray-800 dark:text-gray-200">{fmt(value)}</span>
    </div>
  )
}

export function IRReport() {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const investments = useFinanceStore((s) => s.investments)
  const appSettings = useFinanceStore((s) => s.appSettings)

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear - 1)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['tributaveis', 'exclusiva', 'isentos', 'bens', 'deducoes'])
  )

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const yearMonths = useMemo(() =>
    Array.from({ length: 12 }, (_, i) =>
      `${selectedYear}-${String(i + 1).padStart(2, '0')}`
    ),
    [selectedYear]
  )

  const yearTransactions = useMemo(() =>
    transactions.filter((t) => yearMonths.includes(t.monthKey)),
    [transactions, yearMonths]
  )

  const yearExtraordinary = useMemo(() =>
    extraordinaryEntries.filter((e) => yearMonths.includes(e.monthKey)),
    [extraordinaryEntries, yearMonths]
  )

  // ── RENDIMENTOS TRIBUTÁVEIS RECEBIDOS DE PJ ────────────────────

  const regularIncome = useMemo(() => {
    return yearTransactions
      .filter((t) => t.section === 'entradas' && !t.tags?.includes('investment-yield'))
      .reduce((s, t) => s + t.amount, 0)
  }, [yearTransactions])

  // Monthly breakdown for income
  const incomeByMonth = useMemo(() => {
    return yearMonths.map((mk) => {
      const monthTxs = yearTransactions.filter(
        (t) => t.monthKey === mk && t.section === 'entradas' && !t.tags?.includes('investment-yield')
      )
      return { month: mk, total: monthTxs.reduce((s, t) => s + t.amount, 0) }
    }).filter((m) => m.total > 0)
  }, [yearTransactions, yearMonths])

  // ── RENDIMENTOS TRIBUTAÇÃO EXCLUSIVA/DEFINITIVA ────────────────

  const exclusiveIncome = useMemo(() => {
    const decimo = yearExtraordinary
      .filter((e) => e.type === 'decimo_terceiro')
      .reduce((s, e) => s + e.grossAmount, 0)
    const plr = yearExtraordinary
      .filter((e) => e.type === 'plr')
      .reduce((s, e) => s + e.grossAmount, 0)

    // Taxable investment yields (estimated)
    let taxableYields = 0
    let estimatedIR = 0
    const taxableInvestmentDetails: { name: string; type: string; yield: number; ir: number }[] = []

    investments
      .filter((inv) => !getInvestmentMeta(inv.investmentType).isTaxExempt)
      .forEach((inv) => {
        const monthlyYield = inv.principal * inv.monthlyYieldPercent / 100
        const startParts = inv.startMonth.split('-').map(Number)
        const invStartMonth = startParts[0] * 12 + startParts[1]
        let months = 0
        yearMonths.forEach((mk) => {
          const [y, m] = mk.split('-').map(Number)
          if (y * 12 + m >= invStartMonth && inv.isActive) months++
        })
        const annualYield = monthlyYield * months
        if (annualYield > 0) {
          const days = daysSinceStartMonth(inv.startMonth)
          const { taxAmount } = netYieldAfterIR(annualYield, days, false)
          taxableYields += annualYield
          estimatedIR += taxAmount
          taxableInvestmentDetails.push({
            name: inv.name,
            type: getInvestmentMeta(inv.investmentType).label,
            yield: annualYield,
            ir: taxAmount,
          })
        }
      })

    return {
      decimo,
      plr,
      taxableYields,
      estimatedIR,
      taxableInvestmentDetails,
      total: decimo + plr + taxableYields,
    }
  }, [yearExtraordinary, investments, yearMonths])

  // ── RENDIMENTOS ISENTOS E NÃO TRIBUTÁVEIS ─────────────────────

  const exemptIncome = useMemo(() => {
    const ferias = yearExtraordinary
      .filter((e) => e.type === 'ferias')
      .reduce((s, e) => s + e.grossAmount, 0)

    const bonus = yearExtraordinary
      .filter((e) => e.type === 'bonus' || e.type === 'outro')
      .reduce((s, e) => s + e.grossAmount, 0)

    let exemptYields = 0
    const exemptInvestmentDetails: { name: string; type: string; yield: number }[] = []

    investments
      .filter((inv) => getInvestmentMeta(inv.investmentType).isTaxExempt)
      .forEach((inv) => {
        const monthlyYield = inv.principal * inv.monthlyYieldPercent / 100
        const startParts = inv.startMonth.split('-').map(Number)
        const invStartMonth = startParts[0] * 12 + startParts[1]
        let months = 0
        yearMonths.forEach((mk) => {
          const [y, m] = mk.split('-').map(Number)
          if (y * 12 + m >= invStartMonth && inv.isActive) months++
        })
        const annualYield = monthlyYield * months
        if (annualYield > 0) {
          exemptYields += annualYield
          exemptInvestmentDetails.push({
            name: inv.name,
            type: getInvestmentMeta(inv.investmentType).label,
            yield: annualYield,
          })
        }
      })

    return { ferias, bonus, exemptYields, exemptInvestmentDetails, total: ferias + bonus + exemptYields }
  }, [yearExtraordinary, investments, yearMonths])

  // ── BENS E DIREITOS ───────────────────────────────────────────

  const assets = useMemo(() => {
    return investments.map((inv) => ({
      id: inv.id,
      name: inv.name,
      type: getInvestmentMeta(inv.investmentType).label,
      principal: inv.principal,
      isActive: inv.isActive,
    }))
  }, [investments])

  const totalAssets = assets.reduce((s, a) => s + a.principal, 0)

  // ── DEDUÇÕES (Dízimo + Oferta = Doações) ──────────────────────

  const deductions = useMemo(() => {
    const tithes = yearExtraordinary.reduce((s, e) => s + e.tithe, 0)
    const offerings = yearExtraordinary.reduce((s, e) => s + e.offering, 0)
    return { tithes, offerings, total: tithes + offerings }
  }, [yearExtraordinary])

  // ── TOTALS ────────────────────────────────────────────────────

  const totalRendimentos = regularIncome + exclusiveIncome.total + exemptIncome.total
  const totalDespesas = yearTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  // ── CSV EXPORT ────────────────────────────────────────────────

  function exportCSV() {
    const rows: string[][] = [
      ['Relatório IRPF - Ano-base ' + selectedYear],
      [],
      ['CATEGORIA', 'DESCRIÇÃO', 'VALOR (R$)'],
      [],
      ['RENDIMENTOS TRIBUTÁVEIS'],
      ['Salário/Renda regular', '', regularIncome.toFixed(2)],
      ...incomeByMonth.map((m) => ['', `  ${m.month}`, m.total.toFixed(2)]),
      [],
      ['RENDIMENTOS TRIBUTAÇÃO EXCLUSIVA/DEFINITIVA'],
      ['13° Salário', '', exclusiveIncome.decimo.toFixed(2)],
      ['PLR', '', exclusiveIncome.plr.toFixed(2)],
      ...exclusiveIncome.taxableInvestmentDetails.map((d) => [
        `Rendimento ${d.type}`, d.name, d.yield.toFixed(2),
      ]),
      ['IR Retido (estimado)', '', exclusiveIncome.estimatedIR.toFixed(2)],
      [],
      ['RENDIMENTOS ISENTOS E NÃO TRIBUTÁVEIS'],
      ['Férias', '', exemptIncome.ferias.toFixed(2)],
      ['Bônus/Outros', '', exemptIncome.bonus.toFixed(2)],
      ...exemptIncome.exemptInvestmentDetails.map((d) => [
        `Rendimento ${d.type} (isento)`, d.name, d.yield.toFixed(2),
      ]),
      [],
      ['BENS E DIREITOS'],
      ...assets.map((a) => [a.type, a.name, a.principal.toFixed(2)]),
      ['Total bens', '', totalAssets.toFixed(2)],
      [],
      ['PAGAMENTOS EFETUADOS (DEDUÇÕES)'],
      ['Dízimo (doação)', '', deductions.tithes.toFixed(2)],
      ['Oferta (doação)', '', deductions.offerings.toFixed(2)],
      ['Total deduções', '', deductions.total.toFixed(2)],
      [],
      ['RESUMO'],
      ['Total rendimentos', '', totalRendimentos.toFixed(2)],
      ['Total despesas', '', totalDespesas.toFixed(2)],
      ['IR estimado sobre investimentos', '', exclusiveIncome.estimatedIR.toFixed(2)],
    ]

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `irpf-${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── PDF EXPORT (via print) ──────────────────────────────────

  const prevExpanded = useRef<Set<string>>(new Set())

  function exportPDF() {
    // Expand all sections before printing
    prevExpanded.current = new Set(expandedSections)
    setExpandedSections(new Set(['tributaveis', 'exclusiva', 'isentos', 'bens', 'deducoes']))
    setTimeout(() => {
      window.print()
      // Restore previous state after print dialog
      setTimeout(() => setExpandedSections(prevExpanded.current), 300)
    }, 100)
  }

  // ── RENDER ────────────────────────────────────────────────────

  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Relatório IRPF</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 dark:text-gray-400">Ano-base:</label>
          <select
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - 1 - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 transition-colors cursor-pointer print:hidden"
          >
            <Printer size={14} />
            PDF
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <p className="font-semibold mb-1">Este relatório é uma estimativa baseada nos dados do app.</p>
          <p>Valores de rendimentos de investimentos são projeções calculadas. Para a declaração oficial do IRPF, utilize os informes de rendimentos fornecidos pelas instituições financeiras. Dízimos e ofertas são classificados como doações (dedutíveis até o limite legal).</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Rendimentos', value: totalRendimentos, color: 'text-emerald-600' },
          { label: 'Despesas', value: totalDespesas, color: 'text-red-500' },
          { label: 'Deduções', value: deductions.total, color: 'text-indigo-600' },
          { label: 'IR estimado', value: exclusiveIncome.estimatedIR, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-base font-bold ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Report sections */}
      <div className="flex flex-col gap-3">
        {/* 1. Rendimentos Tributáveis */}
        <ReportSection
          id="tributaveis"
          title="Rendimentos Tributáveis Recebidos de PJ"
          icon={<Building2 size={16} className="text-indigo-600" />}
          total={regularIncome}
          expanded={expandedSections.has('tributaveis')}
          onToggle={() => toggleSection('tributaveis')}
          badge="Ficha: Rend. Tributáveis"
          badgeColor="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        >
          <div className="pt-3">
            {incomeByMonth.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum rendimento registrado em {selectedYear}.</p>
            ) : (
              <>
                {incomeByMonth.map(({ month, total }) => {
                  const [, m] = month.split('-').map(Number)
                  return <LineItem key={month} label={monthLabels[m - 1]} value={total} />
                })}
                <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                  <LineItem label="Total anual" value={regularIncome} />
                </div>
              </>
            )}
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500">
              <Info size={12} className="shrink-0 mt-0.5" />
              <span>Inclui todos os lançamentos na seção "Entradas" (exceto rendimentos de investimentos).</span>
            </div>
          </div>
        </ReportSection>

        {/* 2. Tributação Exclusiva */}
        <ReportSection
          id="exclusiva"
          title="Rendimentos c/ Tributação Exclusiva"
          icon={<Landmark size={16} className="text-amber-600" />}
          total={exclusiveIncome.total}
          expanded={expandedSections.has('exclusiva')}
          onToggle={() => toggleSection('exclusiva')}
          badge="Ficha: Rend. Exclusivos"
          badgeColor="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        >
          <div className="pt-3">
            {exclusiveIncome.decimo > 0 && (
              <LineItem label="13° Salário" value={exclusiveIncome.decimo} sub="Tributação exclusiva na fonte" />
            )}
            {exclusiveIncome.plr > 0 && (
              <LineItem label="PLR" value={exclusiveIncome.plr} sub="Tributação exclusiva na fonte" />
            )}
            {exclusiveIncome.taxableInvestmentDetails.length > 0 && (
              <>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-3 mb-1">Rendimentos de Investimentos (tributáveis)</p>
                {exclusiveIncome.taxableInvestmentDetails.map((d) => (
                  <div key={d.name} className="flex items-center justify-between py-1.5 text-sm">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{d.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{fmt(d.yield)}</span>
                      <span className="text-xs text-red-400 ml-2">IR: {fmt(d.ir)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {exclusiveIncome.total === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum rendimento de tributação exclusiva.</p>
            )}
            {exclusiveIncome.estimatedIR > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-red-500 font-medium">IR retido estimado (investimentos)</span>
                  <span className="font-bold text-red-500">{fmt(exclusiveIncome.estimatedIR)}</span>
                </div>
              </div>
            )}
          </div>
        </ReportSection>

        {/* 3. Rendimentos Isentos */}
        <ReportSection
          id="isentos"
          title="Rendimentos Isentos e Não Tributáveis"
          icon={<ShieldCheck size={16} className="text-emerald-600" />}
          total={exemptIncome.total}
          expanded={expandedSections.has('isentos')}
          onToggle={() => toggleSection('isentos')}
          badge="Ficha: Rend. Isentos"
          badgeColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        >
          <div className="pt-3">
            {exemptIncome.ferias > 0 && (
              <LineItem label="Férias" value={exemptIncome.ferias} sub="Abono pecuniário" />
            )}
            {exemptIncome.bonus > 0 && (
              <LineItem label="Bônus / Outros" value={exemptIncome.bonus} />
            )}
            {exemptIncome.exemptInvestmentDetails.length > 0 && (
              <>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-3 mb-1">Rendimentos de Investimentos (isentos)</p>
                {exemptIncome.exemptInvestmentDetails.map((d) => (
                  <div key={d.name} className="flex items-center justify-between py-1.5 text-sm">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                      <span className="text-xs text-emerald-500 ml-2">{d.type} — Isento IR</span>
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{fmt(d.yield)}</span>
                  </div>
                ))}
              </>
            )}
            {exemptIncome.total === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum rendimento isento registrado.</p>
            )}
          </div>
        </ReportSection>

        {/* 4. Bens e Direitos */}
        <ReportSection
          id="bens"
          title="Bens e Direitos"
          icon={<Briefcase size={16} className="text-indigo-600" />}
          total={totalAssets}
          expanded={expandedSections.has('bens')}
          onToggle={() => toggleSection('bens')}
          badge="Ficha: Bens e Direitos"
          badgeColor="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        >
          <div className="pt-3">
            {assets.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum investimento cadastrado.</p>
            ) : (
              <>
                {assets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 text-sm">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">{a.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{a.type}</span>
                      {!a.isActive && <span className="text-xs text-gray-400 ml-2">(inativo)</span>}
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{fmt(a.principal)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                  <LineItem label="Total em 31/12" value={totalAssets} />
                </div>
              </>
            )}
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500">
              <Info size={12} className="shrink-0 mt-0.5" />
              <span>Declare o saldo em 31/12/{selectedYear}. Use os informes das instituições para valores exatos.</span>
            </div>
          </div>
        </ReportSection>

        {/* 5. Deduções */}
        <ReportSection
          id="deducoes"
          title="Pagamentos Efetuados (Deduções)"
          icon={<Heart size={16} className="text-pink-500" />}
          total={deductions.total}
          expanded={expandedSections.has('deducoes')}
          onToggle={() => toggleSection('deducoes')}
          badge="Ficha: Pagamentos"
          badgeColor="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
        >
          <div className="pt-3">
            {deductions.tithes > 0 && (
              <LineItem label="Dízimo" value={deductions.tithes} sub="Doação — dedutível" />
            )}
            {deductions.offerings > 0 && (
              <LineItem label="Oferta" value={deductions.offerings} sub="Doação — dedutível" />
            )}
            {deductions.total === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma doação registrada.</p>
            )}
            {deductions.total > 0 && (
              <div className="mt-3 flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500">
                <Info size={12} className="shrink-0 mt-0.5" />
                <span>Doações a entidades religiosas são dedutíveis. Guarde os recibos da igreja/instituição.</span>
              </div>
            )}
          </div>
        </ReportSection>
      </div>

      {/* Footer summary */}
      <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 p-5">
        <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-3">Resumo do Ano-base {selectedYear}</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <span className="text-indigo-700 dark:text-indigo-300">Renda tributável</span>
          <span className="text-right font-semibold text-indigo-800 dark:text-indigo-200">{fmt(regularIncome)}</span>

          <span className="text-indigo-700 dark:text-indigo-300">Renda trib. exclusiva</span>
          <span className="text-right font-semibold text-indigo-800 dark:text-indigo-200">{fmt(exclusiveIncome.total)}</span>

          <span className="text-indigo-700 dark:text-indigo-300">Renda isenta</span>
          <span className="text-right font-semibold text-indigo-800 dark:text-indigo-200">{fmt(exemptIncome.total)}</span>

          <span className="text-indigo-700 dark:text-indigo-300">Total rendimentos</span>
          <span className="text-right font-bold text-indigo-800 dark:text-indigo-200">{fmt(totalRendimentos)}</span>

          <span className="text-indigo-700 dark:text-indigo-300">Total despesas</span>
          <span className="text-right font-semibold text-red-500">{fmt(totalDespesas)}</span>

          <span className="text-indigo-700 dark:text-indigo-300">Deduções (doações)</span>
          <span className="text-right font-semibold text-pink-600">{fmt(deductions.total)}</span>

          <span className="text-indigo-700 dark:text-indigo-300">Patrimônio (bens)</span>
          <span className="text-right font-semibold text-indigo-800 dark:text-indigo-200">{fmt(totalAssets)}</span>

          <span className="text-indigo-700 dark:text-indigo-300">IR estimado (invest.)</span>
          <span className="text-right font-semibold text-amber-600">{fmt(exclusiveIncome.estimatedIR)}</span>
        </div>
      </div>
    </div>
  )
}
