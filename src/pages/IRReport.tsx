import { useState, useMemo } from 'react'
import {
  FileText, Calendar, Sparkles, ListChecks, Building2
} from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { BankConnection } from '../lib/openBanking'
import { UploadedFile } from '../lib/pdfParser'
import { analyzeIRPF, calculateIR } from '../utils/irCalc'
import { IRSummary } from '../components/ir/IRSummary'
import { IRChecklist } from '../components/ir/IRChecklist'
import { IRSources } from '../components/ir/IRSources'
import { IRDetails } from '../components/ir/IRDetails'
import { IRDashboardCards } from '../components/ir/IRDashboardCards'

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

  const [connectedBanks, setConnectedBanks] = useState<BankConnection[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

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
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <IRSummary analysis={analysis} />
          <IRDashboardCards analysis={analysis} aliquot={aliquot} calculatedTax={calculatedTax} />
        </div>
      )}

      {activeTab === 'details' && (
        <IRDetails analysis={analysis} />
      )}

      {activeTab === 'checklist' && (
        <IRChecklist checklistProgress={checklistProgress} toggleChecklist={toggleChecklist} />
      )}

      {activeTab === 'banks' && (
        <IRSources
          connectedBanks={connectedBanks}
          setConnectedBanks={setConnectedBanks}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
        />
      )}
    </div>
  )
}
