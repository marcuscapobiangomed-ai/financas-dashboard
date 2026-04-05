import { useState, useMemo } from 'react'
import {
  FileText, AlertTriangle, CheckCircle, XCircle,
  Heart, Briefcase, TrendingUp,
  ListChecks, Users, Calendar, Sparkles, Bell, Target, Zap,
  Shield, Stethoscope, GraduationCap, Building2, Landmark,
} from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { getInvestmentMeta } from '../constants/investmentTypes'
import { AVAILABLE_BANKS, BankConnection } from '../lib/openBanking'
import { uploadFile, UploadedFile } from '../lib/pdfParser'
import type { Transaction } from '../types/transaction'
import type { Investment } from '../types/investment'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card-lg p-5 ${className}`}>
      {children}
    </div>
  )
}

interface IRAnalysis {
  isMandatory: boolean
  reasons: { type: string; description: string; value?: number }[]
  income: { regular: number; exclusive: number; exempt: number; total: number }
  deductions: { tithes: number; offerings: number; health: number; education: number; inss: number; total: number }
  investments: { taxable: { name: string; value: number; type: string }[]; exempt: { name: string; value: number; type: string }[] }
  assets: { total: number; breakdown: { category: string; value: number }[] }
  completeness: { score: number; missing: string[]; suggestions: string[] }
  alerts: { type: 'warning' | 'error' | 'success'; title: string; description: string }[]
}

const OBRIGATORIEDADE_LIMITS = {
  incomeThreshold: 211200,
  exemptIncomeThreshold: 40000,
  patrimonyThreshold: 300000,
  ruralThreshold: 128400,
}

const DEDUCTIBLE_EXPENSE_PATTERNS = {
  health: ['hospital', 'clínica', 'médic', 'dentista', 'laboratório', 'exame', 'remédio', 'farmácia', 'plano de saúde', 'convênio médico', 'psicólogo', 'fisioterapia', 'terapia'],
  education: ['faculdade', 'universidade', 'escola', 'curso', 'graduação', 'mestrado', 'doutorado', 'idioma', 'livro didático', 'material escolar'],
  inss: ['inss', 'previdência', 'contribuição previdenciária'],
}

function analyzeIRPF(
  transactions: Transaction[],
  extraordinaryEntries: { monthKey: string; type: string; grossAmount: number; tithe: number; offering: number }[],
  investments: Investment[],
  selectedYear: number
): IRAnalysis {
  const yearMonths = Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`)

  const yearTransactions = transactions.filter(t => yearMonths.includes(t.monthKey))
  const yearExtra = extraordinaryEntries.filter(e => yearMonths.includes(e.monthKey))

  const regularIncome = yearTransactions
    .filter(t => t.section === 'entradas' && !t.tags?.includes('investment-yield'))
    .reduce((s, t) => s + t.amount, 0)

  const exclusiveIncome = {
    decimo: yearExtra.filter(e => e.type === 'decimo_terceiro').reduce((s, e) => s + e.grossAmount, 0),
    plr: yearExtra.filter(e => e.type === 'plr').reduce((s, e) => s + e.grossAmount, 0),
    taxableYields: 0,
  }

  const taxableInvestments: { name: string; value: number; type: string }[] = []
  const exemptInvestments: { name: string; value: number; type: string }[] = []

  investments.forEach(inv => {
    const isExempt = getInvestmentMeta(inv.investmentType).isTaxExempt
    const monthlyYield = inv.principal * inv.monthlyYieldPercent / 100
    const startParts = inv.startMonth.split('-').map(Number)
    const invStartMonth = startParts[0] * 12 + startParts[1]
    let months = 0
    yearMonths.forEach(mk => {
      const [y, m] = mk.split('-').map(Number)
      if (y * 12 + m >= invStartMonth && inv.isActive) months++
    })
    const annualYield = monthlyYield * months

    if (annualYield > 0) {
      if (isExempt) {
        exemptInvestments.push({ name: inv.name, value: annualYield, type: getInvestmentMeta(inv.investmentType).label })
      } else {
        exclusiveIncome.taxableYields += annualYield
        taxableInvestments.push({ name: inv.name, value: annualYield, type: getInvestmentMeta(inv.investmentType).label })
      }
    }
  })

  const exclusiveTotal = exclusiveIncome.decimo + exclusiveIncome.plr + exclusiveIncome.taxableYields

  const exemptIncome = {
    ferias: yearExtra.filter(e => e.type === 'ferias').reduce((s, e) => s + e.grossAmount, 0),
    bonus: yearExtra.filter(e => e.type === 'bonus' || e.type === 'outro').reduce((s, e) => s + e.grossAmount, 0),
    yields: exemptInvestments.reduce((s, i) => s + i.value, 0),
  }
  const exemptTotal = exemptIncome.ferias + exemptIncome.bonus + exemptIncome.yields

  const totalIncome = regularIncome + exclusiveTotal + exemptTotal

  const totalAssets = investments.reduce((s, inv) => s + inv.principal, 0)

  const expenses = yearTransactions.filter(t => t.type === 'expense')
  const healthExpenses = expenses.filter(e => DEDUCTIBLE_EXPENSE_PATTERNS.health.some(p => e.description?.toLowerCase().includes(p)))
  const educationExpenses = expenses.filter(e => DEDUCTIBLE_EXPENSE_PATTERNS.education.some(p => e.description?.toLowerCase().includes(p)))

  const deductions = {
    tithes: yearExtra.reduce((s, e) => s + e.tithe, 0),
    offerings: yearExtra.reduce((s, e) => s + e.offering, 0),
    health: healthExpenses.reduce((s, e) => s + e.amount, 0),
    education: educationExpenses.reduce((s, e) => s + e.amount, 0),
    inss: 0,
  }
  const deductionsTotal = deductions.tithes + deductions.offerings + deductions.health + deductions.education + deductions.inss

  const reasons: { type: string; description: string; value?: number }[] = []
  const alerts: { type: 'warning' | 'error' | 'success'; title: string; description: string }[] = []

  if (regularIncome > OBRIGATORIEDADE_LIMITS.incomeThreshold) {
    reasons.push({ type: 'renda', description: 'Renda tributável acima de R$ 211.200', value: regularIncome })
  }
  if (exemptTotal > OBRIGATORIEDADE_LIMITS.exemptIncomeThreshold) {
    reasons.push({ type: 'isenta', description: 'Renda isenta acima de R$ 40.000', value: exemptTotal })
  }
  if (totalAssets > OBRIGATORIEDADE_LIMITS.patrimonyThreshold) {
    reasons.push({ type: 'patrimonio', description: 'Bens acima de R$ 300.000', value: totalAssets })
  }

  const isMandatory = reasons.length > 0

  if (deductions.tithes > regularIncome * 0.1) {
    alerts.push({
      type: 'warning',
      title: 'Dízimos acima do limite',
      description: `Você declarou R$ ${fmt(deductions.tithes)} em dízimos, mas apenas R$ ${fmt(regularIncome * 0.1)} (10%) será considerado na dedução.`,
    })
  }

  if (deductions.education > 0 && regularIncome > 0) {
    const maxEducation = regularIncome * 0.3
    if (deductions.education > maxEducation) {
      alerts.push({
        type: 'warning',
        title: 'Despesas com educação limitadas',
        description: `Suas despesas com educação (R$ ${fmt(deductions.education)}) excedem o limite de 30% da renda (R$ ${fmt(maxEducation)}).`,
      })
    }
  }

  if (healthExpenses.length > 0) {
    alerts.push({
      type: 'success',
      title: 'Despesas médicas detectadas',
      description: `Encontramos R$ ${fmt(deductions.health)} em despesas médicas - estas são 100% dedutíveis!`,
    })
  }

  if (taxableInvestments.length > 0) {
    const estimatedIR = taxableInvestments.reduce((s, inv) => s + inv.value * 0.15, 0)
    alerts.push({
      type: 'warning',
      title: 'Imposto sobre investimentos',
      description: `Seus investimentos tributáveis devem gerar IR de aproximadamente R$ ${fmt(estimatedIR)} (15% sobre rendimentos).`,
    })
  }

  const missing: string[] = []
  const suggestions: string[] = []

  if (regularIncome === 0) missing.push('Nenhuma renda tributável encontrada')
  else suggestions.push(`Renda tributável de R$ ${fmt(regularIncome)} mapeada automaticamente`)

  if (deductions.health === 0) suggestions.push('💡 Dica: Adicione despesas médicas para dedução integral')
  if (deductions.education > 0) suggestions.push(`✓ Educação: R$ ${fmt(deductions.education)} em deduções`)

  if (yearExtra.filter(e => e.type === 'decimo_terceiro').length === 0) suggestions.push('💡 Cadastre seu 13° salário nos lançamentos extraordinários')
  if (yearExtra.filter(e => e.type === 'plr').length === 0) suggestions.push('💡 Cadastre PLR (Participação nos Lucros) se aplicável')
  if (yearExtra.filter(e => e.type === 'ferias').length === 0) suggestions.push('💡 Cadastre férias/abono pecuniário')

  const completenessScore = Math.min(100, Math.round(
    (regularIncome > 0 ? 25 : 0) +
    (exclusiveTotal > 0 ? 15 : 0) +
    (exemptTotal > 0 ? 10 : 0) +
    (totalAssets > 0 ? 20 : 0) +
    (deductionsTotal > 0 ? 15 : 0) +
    (investments.length > 0 ? 15 : 0)
  ))

  return {
    isMandatory,
    reasons,
    income: { regular: regularIncome, exclusive: exclusiveTotal, exempt: exemptTotal, total: totalIncome },
    deductions: { ...deductions, total: deductionsTotal },
    investments: { taxable: taxableInvestments, exempt: exemptInvestments },
    assets: {
      total: totalAssets,
      breakdown: [
        { category: 'Investimentos', value: totalAssets },
        { category: 'Conta Corrente', value: 0 },
        { category: 'Outros', value: 0 },
      ],
    },
    completeness: { score: completenessScore, missing, suggestions },
    alerts,
  }
}

function calculateIR(income: number): { aliquot: number; taxDue: number; effectiveRate: number } {
  const table = [
    { limit: 2259.20, aliquot: 0, deduction: 0 },
    { limit: 2826.65, aliquot: 7.5, deduction: 169.44 },
    { limit: 3751.05, aliquot: 15, deduction: 381.44 },
    { limit: 4664.68, aliquot: 22.5, deduction: 662.77 },
    { limit: Infinity, aliquot: 27.5, deduction: 896.00 },
  ]
  const row = table.find(t => income <= t.limit) || table[table.length - 1]
  const taxDue = Math.max(0, income * (row.aliquot / 100) - row.deduction)
  return { aliquot: row.aliquot, taxDue, effectiveRate: income > 0 ? (taxDue / income) * 100 : 0 }
}

export function IRReport() {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const investments = useFinanceStore((s) => s.investments)

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear - 1)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'details' | 'checklist' | 'banks'>('dashboard')
  const [checklistProgress, setChecklistProgress] = useState<Set<number>>(new Set())

  const analysis = useMemo(() =>
    analyzeIRPF(transactions, extraordinaryEntries, investments, selectedYear),
    [transactions, extraordinaryEntries, investments, selectedYear]
  )

  const { aliquot, taxDue: calculatedTax } = calculateIR(
    analysis.income.regular - Math.min(analysis.deductions.tithes + analysis.deductions.offerings, analysis.income.regular * 0.1)
  )

  const toggleChecklist = (id: number) => {
    const next = new Set(checklistProgress)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecklistProgress(next)
  }

  const checklistItems = [
    { id: 1, text: 'Informe de Rendimentos (IRPF) do meu emprego', category: 'rendimentos' },
    { id: 2, text: 'Extratos bancários', category: 'bens' },
    { id: 3, text: 'Informe de Rendimentos de investimentos', category: 'investimentos' },
    { id: 4, text: 'Extrato do FGTS', category: 'bens' },
    { id: 5, text: 'INSS - Extrato de contribuições', category: 'rendimentos' },
    { id: 6, text: 'Recibo de despesas médicas', category: 'deducoes' },
    { id: 7, text: 'Recibo de plano de saúde', category: 'deducoes' },
    { id: 8, text: 'Despesas com educação', category: 'deducoes' },
    { id: 9, text: 'Recibo de dízimos', category: 'deducoes' },
    { id: 10, text: 'CPF dos dependentes', category: 'familia' },
  ]

  const checklistByCategory = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof checklistItems>)

  const progressPercent = Math.round((checklistProgress.size / checklistItems.length) * 100)

  const [connectedBanks, setConnectedBanks] = useState<BankConnection[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleDisconnectBank = (connectionId: string) => {
    setConnectedBanks(prev => prev.filter(b => b.id !== connectionId))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const result = await uploadFile(file)
        setUploadedFiles(prev => [...prev, result])
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="glass-panel-lg p-6 border border-white/40 dark:border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assistente de Imposto de Renda</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Análise automática dos seus dados</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 glass-card px-4 py-2">
              <Calendar size={16} className="text-indigo-500" />
              <label className="text-sm text-gray-600 dark:text-gray-400">Ano-base:</label>
              <select className="bg-transparent border-0 text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none cursor-pointer" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {Array.from({ length: 5 }, (_, i) => currentYear - 1 - i).map((y) => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5 p-1 bg-indigo-50/50 dark:bg-indigo-900/30 rounded-xl w-fit">
          {[
            { id: 'dashboard' as const, label: 'Análise', icon: Sparkles },
            { id: 'details' as const, label: 'Detalhes', icon: FileText },
            { id: 'checklist' as const, label: 'Checklist', icon: ListChecks },
            { id: 'banks' as const, label: 'Bancos', icon: Building2 },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200/50 dark:border-emerald-700/50">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${analysis.isMandatory ? 'bg-red-500' : 'bg-emerald-500'}`}>
                  {analysis.isMandatory ? <AlertTriangle size={24} className="text-white" /> : <CheckCircle size={24} className="text-white" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {analysis.isMandatory ? '⚠️ Obrigado a Declarar' : 'Não Obligado a Declarar'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {analysis.isMandatory
                      ? 'Com base nos seus dados, você deve apresentar a DIRPF'
                      : 'Sua renda está abaixo do limite obrigatório'}
                  </p>
                </div>
              </div>
              {analysis.reasons.length > 0 && (
                <div className="space-y-2">
                  {analysis.reasons.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-red-50/50 dark:bg-red-900/20 border border-red-200/30">
                      <XCircle size={16} className="text-red-500" />
                      <span className="text-sm text-red-700 dark:text-red-400">{r.description}</span>
                      {r.value && <span className="ml-auto text-sm font-semibold text-red-600">{fmt(r.value)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GlassCard className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -mr-8 -mt-8" />
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <span className="text-xs text-gray-500 uppercase">Receitas</span>
                </div>
                <p className="text-xl font-bold text-emerald-600">{fmt(analysis.income.total)}</p>
                <p className="text-xs text-gray-400 mt-1">mapeadas automaticamente</p>
              </GlassCard>

              <GlassCard className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/10 rounded-full -mr-8 -mt-8" />
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={16} className="text-pink-500" />
                  <span className="text-xs text-gray-500 uppercase">Deduções</span>
                </div>
                <p className="text-xl font-bold text-pink-500">{fmt(analysis.deductions.total)}</p>
                <p className="text-xs text-gray-400 mt-1">encontradas automaticamente</p>
              </GlassCard>

              <GlassCard className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full -mr-8 -mt-8" />
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={16} className="text-indigo-500" />
                  <span className="text-xs text-gray-500 uppercase">Patrimônio</span>
                </div>
                <p className="text-xl font-bold text-indigo-600">{fmt(analysis.assets.total)}</p>
                <p className="text-xs text-gray-400 mt-1">em investimentos</p>
              </GlassCard>

              <GlassCard className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full -mr-8 -mt-8" />
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-amber-500" />
                  <span className="text-xs text-gray-500 uppercase">Completude</span>
                </div>
                <p className="text-xl font-bold text-amber-600">{analysis.completeness.score}%</p>
                <p className="text-xs text-gray-400 mt-1">da declaração preenchida</p>
              </GlassCard>
            </div>

            {analysis.alerts.length > 0 && (
              <GlassCard>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <Bell size={16} className="text-amber-500" />
                  Alertas e Sugestões
                </h3>
                <div className="space-y-3">
                  {analysis.alerts.map((alert, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${
                      alert.type === 'success' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/30' :
                      alert.type === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200/30' :
                      'bg-red-50/50 dark:bg-red-900/20 border-red-200/30'
                    }`}>
                      <div className="flex items-start gap-3">
                        {alert.type === 'success' && <CheckCircle size={18} className="text-emerald-500 shrink-0" />}
                        {alert.type === 'warning' && <AlertTriangle size={18} className="text-amber-500 shrink-0" />}
                        {alert.type === 'error' && <XCircle size={18} className="text-red-500 shrink-0" />}
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{alert.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alert.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Sugestões Automáticas</h3>
              <div className="space-y-2">
                {analysis.completeness.suggestions.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/30">
                    <Zap size={16} className="text-indigo-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{s}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="space-y-4">
            <GlassCard className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">Simulação de IR</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Renda tributável</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(analysis.income.regular)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Deduções</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">- {fmt(Math.min(analysis.deductions.total, analysis.income.regular * 0.1))}</span>
                </div>
                <div className="border-t border-blue-200/50 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Base de cálculo</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(Math.max(0, analysis.income.regular - Math.min(analysis.deductions.total, analysis.income.regular * 0.1)))}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-400">Alíquota</span>
                    <span className="font-semibold text-indigo-600">{aliquot}%</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-blue-200/50">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">IR Provável</span>
                    <span className="text-lg font-bold text-blue-600">{fmt(calculatedTax)}</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mapeamento Automático</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={14} className="text-indigo-500" />
                    <span className="text-xs font-medium text-indigo-600">Rendimentos Tributáveis</span>
                  </div>
                  <p className="text-lg font-bold text-indigo-600">{fmt(analysis.income.regular)}</p>
                  <p className="text-xs text-gray-400">Entradas do app</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark size={14} className="text-amber-500" />
                    <span className="text-xs font-medium text-amber-600">Tributação Exclusiva</span>
                  </div>
                  <p className="text-lg font-bold text-amber-600">{fmt(analysis.income.exclusive)}</p>
                  <p className="text-xs text-gray-400">13°, PLR, investimentos</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} className="text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600">Rendimentos Isentos</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">{fmt(analysis.income.exempt)}</p>
                  <p className="text-xs text-gray-400">Férias, isentos</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Deduções Detectadas</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg bg-pink-50/50 dark:bg-pink-900/20">
                  <div className="flex items-center gap-2">
                    <Heart size={14} className="text-pink-500" />
                    <span className="text-sm text-gray-600">Dízimos</span>
                  </div>
                  <span className="font-semibold text-pink-500">{fmt(analysis.deductions.tithes)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-red-50/50 dark:bg-red-900/20">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={14} className="text-red-500" />
                    <span className="text-sm text-gray-600">Saúde</span>
                  </div>
                  <span className="font-semibold text-red-500">{fmt(analysis.deductions.health)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-blue-500" />
                    <span className="text-sm text-gray-600">Educação</span>
                  </div>
                  <span className="font-semibold text-blue-500">{fmt(analysis.deductions.education)}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Investimentos Tributáveis</h3>
            {analysis.investments.taxable.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum investimento tributável</p>
            ) : (
              <div className="space-y-2">
                {analysis.investments.taxable.map((inv, i) => (
                  <div key={i} className="flex justify-between p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/30">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{inv.name}</p>
                      <p className="text-xs text-gray-400">{inv.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-600">{fmt(inv.value)}</p>
                      <p className="text-xs text-amber-500">rendimento</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Investimentos Isentos</h3>
            {analysis.investments.exempt.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum investimento isento</p>
            ) : (
              <div className="space-y-2">
                {analysis.investments.exempt.map((inv, i) => (
                  <div key={i} className="flex justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/30">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{inv.name}</p>
                      <p className="text-xs text-gray-400">{inv.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{fmt(inv.value)}</p>
                      <p className="text-xs text-emerald-500">rendimento</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Checklist de Documentos</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Seus dados já foram mapeados automaticamente!</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-600">{progressPercent}%</p>
                <p className="text-xs text-gray-400">{checklistProgress.size}/{checklistItems.length}</p>
              </div>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(checklistByCategory).map(([category, items]) => (
              <GlassCard key={category}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 capitalize flex items-center gap-2">
                  {category === 'rendimentos' && <TrendingUp size={16} className="text-indigo-500" />}
                  {category === 'investimentos' && <Briefcase size={16} className="text-emerald-500" />}
                  {category === 'bens' && <Building2 size={16} className="text-purple-500" />}
                  {category === 'deducoes' && <Heart size={16} className="text-pink-500" />}
                  {category === 'familia' && <Users size={16} className="text-amber-500" />}
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => {
                    const checked = checklistProgress.has(item.id)
                    return (
                      <div key={item.id} onClick={() => toggleChecklist(item.id)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${checked ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100'}`}>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${checked ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300'}`}>
                          {checked && <CheckCircle size={12} />}
                        </div>
                        <span className={`text-sm ${checked ? 'text-emerald-700 line-through' : 'text-gray-600'}`}>{item.text}</span>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'banks' && (
        <div className="space-y-6">
          <GlassCard className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Building2 size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Fontes de Dados</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Importe seus dados via Open Banking ou upload de PDFs</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/30">
                <h4 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-2">🔐 Open Banking</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Conecte diretamente sua conta bancária para importar automaticamente informes de rendimento.</p>
                <p className="text-xs text-amber-600 mt-2">⚠️ Requer backend configurado</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/30">
                <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2">📄 Upload de PDFs</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Envie seus informes de rendimento em PDF que we'll extrair os dados automaticamente.</p>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-indigo-500" />
                Open Banking - Bancos Disponíveis
              </h3>
              <div className="space-y-2">
                {AVAILABLE_BANKS.map((bank) => {
                  const isConnected = connectedBanks.some(b => b.bankId === bank.id)
                  return (
                    <div key={bank.id} className={`flex items-center justify-between p-3 rounded-lg border ${isConnected ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/30' : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{bank.logo}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{bank.name}</p>
                          <p className="text-xs text-gray-400">Em breve</p>
                        </div>
                      </div>
                      {isConnected ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">Conectado</span>
                          <button onClick={() => handleDisconnectBank(connectedBanks.find(b => b.bankId === bank.id)?.id || '')} className="text-xs text-red-500 hover:underline">
                            Desconectar
                          </button>
                        </div>
                      ) : (
                        <button 
                          disabled={true} 
                          className="text-xs px-3 py-1 rounded-lg font-medium bg-gray-200 text-gray-400 cursor-not-allowed"
                        >
                          Em breve
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/30">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Em desenvolvimento:</strong> O Open Banking permitirá conexão automática com seu banco para importar Informe de Rendimento, saldos e investimentos. 
                  <a href="https://openbanking-brasil.github.io/areadesenvolvedor/" target="_blank" rel="noopener" className="underline"> Mais informações</a>.
                </p>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                Upload de Informe de Rendimento
              </h3>
              
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                  disabled={isUploading}
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <FileText size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isUploading ? 'Processando...' : 'Clique para selecionar ou arraste PDFs aqui'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Máximo 10MB por arquivo</p>
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Arquivos processados</h4>
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className={`flex items-center justify-between p-3 rounded-lg border ${file.status === 'success' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/30' : file.status === 'error' ? 'bg-red-50/50 dark:bg-red-900/20 border-red-200/30' : 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200/30'}`}>
                      <div className="flex items-center gap-3 flex-1">
                        <FileText size={16} className={file.status === 'success' ? 'text-emerald-500' : file.status === 'error' ? 'text-red-500' : 'text-amber-500'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                          {file.status === 'success' && file.parsedData && (
                            <p className="text-xs text-gray-500">R$ {file.parsedData.totalIncome.toLocaleString('pt-BR')} • {file.parsedData.confidence}% confiança</p>
                          )}
                          {file.status === 'error' && (
                            <p className="text-xs text-red-500">{file.errorMessage}</p>
                          )}
                          {file.status === 'processing' && (
                            <p className="text-xs text-amber-500">Processando...</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveFile(file.id)} className="text-gray-400 hover:text-red-500">
                        <XCircle size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          <GlassCard>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Dados Extraídos de PDFs</h3>
            {uploadedFiles.filter(f => f.status === 'success' && f.parsedData).length === 0 ? (
              <div className="text-center py-6">
                <FileText size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum documento processado ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {uploadedFiles.filter(f => f.status === 'success' && f.parsedData).map((file) => (
                  <div key={file.id} className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{file.parsedData?.sourceBank} - {file.parsedData?.year}</p>
                        {file.parsedData?.employeeName && (
                          <p className="text-xs text-gray-500">{file.parsedData.employeeName}</p>
                        )}
                      </div>
                      <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-2 py-1 rounded-full">
                        {file.parsedData?.confidence}% confiança
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Renda Total</p>
                        <p className="font-semibold text-gray-800">{fmt(file.parsedData?.totalIncome || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Tributável</p>
                        <p className="font-semibold text-amber-600">{fmt(file.parsedData?.taxableIncome || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Isenta</p>
                        <p className="font-semibold text-emerald-600">{fmt(file.parsedData?.exemptIncome || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">IR Retido</p>
                        <p className="font-semibold text-red-500">{fmt(file.parsedData?.taxWithheld || 0)}</p>
                      </div>
                    </div>
                    {file.parsedData?.incomeItems && file.parsedData.incomeItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-indigo-200/30">
                        <p className="text-xs text-gray-500 mb-2">Itens identificados:</p>
                        <div className="flex flex-wrap gap-1">
                          {file.parsedData.incomeItems.map((item, i) => (
                            <span key={i} className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
                              {item.type.replace('_', ' ')}: {fmt(item.value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  )
}