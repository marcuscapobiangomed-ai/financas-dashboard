import { useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Upload, FileText, Sparkles, Check, AlertCircle, AlertTriangle,
  Loader2, Trash2, Edit2, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useFinanceStore } from '../store/useFinanceStore'
import { extractTextFromPDF } from '../lib/pdfParser'
import { parseDocumentWithAI, ParsedTransaction, ParsingQuestion } from '../lib/geminiApi'
import { Category, CATEGORY_META } from '../types/category'

export function Import() {
  const navigate = useNavigate()
  const appSettings = useFinanceStore((s) => s.appSettings)
  const transactions = useFinanceStore((s) => s.transactions)
  const addTransactions = useFinanceStore((s) => s.addTransactions)

  // API Key
  const geminiApiKey = appSettings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || ''

  // UI States
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // AI parsed data
  const [extractedTxs, setExtractedTxs] = useState<ParsedTransaction[]>([])
  const [questions, setQuestions] = useState<ParsingQuestion[]>([])
  const [selectedTxs, setSelectedTxs] = useState<Record<number, boolean>>({})

  // Doubts Modal States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showQuestionsModal, setShowQuestionsModal] = useState(false)

  // Get active budget sections
  const activeSections = useMemo(() => {
    const list = [
      { id: 'entradas', label: 'Entradas' },
      { id: 'despesas_fixas', label: 'Despesas Fixas' },
      { id: 'gastos_diarios', label: 'Gastos com Dinheiro' },
      { id: 'extraordinario', label: 'Extraordinário' }
    ]
    const cards = (appSettings.cardSections ?? []).map(c => ({
      id: c.id,
      label: c.label
    }))
    return [...list, ...cards]
  }, [appSettings.cardSections])

  // Drag handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setError(null)
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }, [])

  // Local File Extractors
  async function extractText(file: File): Promise<string> {
    if (file.type === 'application/pdf') {
      setLoadingStep('Extraindo textos do arquivo PDF...')
      return await extractTextFromPDF(file)
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    ) {
      setLoadingStep('Lendo planilha do Excel...')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      let text = ''
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        text += `--- Planilha: ${sheetName} ---\n${csv}\n\n`
      }
      return text
    } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setLoadingStep('Lendo arquivo CSV...')
      return await file.text()
    } else {
      throw new Error('Formato de arquivo não suportado. Use PDF, Excel (.xlsx, .xls) ou CSV.')
    }
  }

  // AI Processing Trigger
  async function handleAnalyze() {
    if (!file) return
    if (!geminiApiKey) {
      setError('Por favor, configure sua Gemini API Key antes de realizar a análise.')
      return
    }

    setLoading(true)
    setError(null)
    setExtractedTxs([])
    setQuestions([])
    setSelectedTxs({})

    try {
      setLoadingStep('Lendo arquivo selecionado...')
      const text = await extractText(file)

      setLoadingStep('Enviando dados para análise da Inteligência Artificial do Gemini...')
      const result = await parseDocumentWithAI(geminiApiKey, text, file.name, activeSections)

      setExtractedTxs(result.transactions)
      
      // Auto-select non-duplicate transactions
      const selectionMap: Record<number, boolean> = {}
      result.transactions.forEach((tx, index) => {
        const isDuplicate = checkIsDuplicate(tx)
        selectionMap[index] = !isDuplicate
      })
      setSelectedTxs(selectionMap)

      if (result.questions && result.questions.length > 0) {
        setQuestions(result.questions)
        setCurrentQuestionIndex(0)
        setShowQuestionsModal(true)
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Ocorreu um erro ao processar o documento.')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  // Duplicate Check logic (Opção A)
  function checkIsDuplicate(tx: ParsedTransaction): boolean {
    return transactions.some(
      (existing) =>
        existing.date === tx.date &&
        Math.abs(existing.amount - tx.amount) < 0.01 &&
        existing.type === tx.type
    )
  }

  // Answer Questions / Resolve Doubts
  function handleAnswerQuestion(optionValue: string) {
    const q = questions[currentQuestionIndex]
    
    // Update the transaction property in the state
    setExtractedTxs((prev) => {
      const copy = [...prev]
      if (copy[q.transactionIndex]) {
        copy[q.transactionIndex] = {
          ...copy[q.transactionIndex],
          [q.property]: optionValue
        }
      }
      return copy
    })

    // Advance or close
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setShowQuestionsModal(false)
    }
  }

  // Skip single doubt
  function handleSkipQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setShowQuestionsModal(false)
    }
  }

  // Skip all remaining doubts
  function handleSkipAllQuestions() {
    setShowQuestionsModal(false)
  }

  // Grid editing handlers
  function handleGridChange<K extends keyof ParsedTransaction>(
    index: number,
    key: K,
    value: ParsedTransaction[K]
  ) {
    setExtractedTxs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [key]: value }
      return copy
    })
  }

  function handleDeleteTx(index: number) {
    setExtractedTxs((prev) => prev.filter((_, i) => i !== index))
    setSelectedTxs((prev) => {
      const copy = { ...prev }
      delete copy[index]
      return copy
    })
  }

  // Save all selected
  async function handleImportConfirm() {
    const toImport = extractedTxs.filter((_, index) => selectedTxs[index])
    if (toImport.length === 0) return

    setLoading(true)
    setLoadingStep('Salvando lançamentos no Supabase...')

    try {
      const mapped = toImport.map((t) => ({
        ...t,
        id: crypto.randomUUID(),
        monthKey: t.date.substring(0, 7),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      addTransactions(mapped)
      setSuccess(true)
      setTimeout(() => {
        navigate('/month')
      }, 2000)
    } catch (err) {
      setError('Falha ao registrar transações no Supabase.')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  // Calculations for preview
  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    extractedTxs.forEach((tx, index) => {
      if (selectedTxs[index]) {
        if (tx.type === 'income') income += tx.amount
        else expense += tx.amount
      }
    })
    return { income, expense }
  }, [extractedTxs, selectedTxs])

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20">
          <Sparkles size={24} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importação Inteligente (IA)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Carregue faturas de cartão em PDF ou planilhas de gastos do Excel
          </p>
        </div>
      </div>

      {/* No API Key warning banner */}
      {!geminiApiKey && (
        <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30 rounded-3xl p-5 flex gap-4 items-start animate-fade-in">
          <AlertCircle className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-sm text-purple-950 dark:text-purple-300">API Key do Gemini não configurada</h3>
            <p className="text-xs text-purple-800/80 dark:text-purple-400/85 mt-1 leading-relaxed">
              Você precisa configurar uma chave do Gemini para usar a importação inteligente por IA. 
              Isso é gratuito e pode ser gerado em poucos cliques. Acesse as{' '}
              <Link to="/settings" className="underline font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white">
                Configurações do App
              </Link>{' '}
              para cadastrar sua chave.
            </p>
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-3xl p-6 flex flex-col items-center gap-3 text-center animate-fade-in">
          <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
          <div>
            <h3 className="text-lg font-bold text-green-900 dark:text-green-300">Importação Concluída!</h3>
            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
              As transações foram salvas e sincronizadas com sucesso. Redirecionando...
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      {!success && extractedTxs.length === 0 && (
        <div className="flex flex-col gap-6">
          {/* Uploader Card */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-10 text-center transition-all bg-white/40 dark:bg-gray-800/20 backdrop-blur-xl ${
              dragActive
                ? 'border-purple-500 bg-purple-500/5'
                : 'border-gray-200 dark:border-white/10 hover:border-purple-400/60 dark:hover:border-purple-500/30'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading || !geminiApiKey}
            />

            <div className="p-4 bg-purple-500/10 dark:bg-purple-500/20 rounded-2xl border border-purple-500/20 text-purple-600 dark:text-purple-400 mb-4">
              <Upload size={32} />
            </div>

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <FileText size={16} className="text-gray-400" />
                  {file.name}
                </span>
                <span className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB ·{' '}
                  <button
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:underline cursor-pointer"
                  >
                    Remover
                  </button>
                </span>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="file-upload"
                  className={`text-sm font-semibold cursor-pointer text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 ${
                    !geminiApiKey && 'pointer-events-none text-gray-400 dark:text-gray-600'
                  }`}
                >
                  Clique para selecionar
                </label>
                <span className="text-sm text-gray-500"> ou arraste e solte o arquivo aqui</span>
                <p className="text-[10px] text-gray-400 mt-2">
                  Suporta extratos em PDF, planilhas Excel (.xlsx, .xls) ou CSV de até 10MB
                </p>
              </div>
            )}
          </div>

          {/* Action trigger button */}
          {file && (
            <button
              onClick={handleAnalyze}
              disabled={loading || !geminiApiKey}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {loadingStep}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Analisar Documento com IA
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Loading overlay when not show in button */}
      {loading && extractedTxs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 animate-pulse">
          <Loader2 size={40} className="text-purple-600 dark:text-purple-400 animate-spin" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{loadingStep}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 text-red-800 dark:text-red-300 p-4 rounded-2xl flex gap-3 items-start animate-fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span className="text-sm leading-relaxed">{error}</span>
        </div>
      )}

      {/* Verification / Preview Table Grid */}
      {!success && extractedTxs.length > 0 && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Summary / Stats Card */}
          <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl p-6 shadow-xl flex flex-wrap gap-6 items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Documento Importado</span>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <FileText size={16} className="text-gray-400" />
                {file?.name}
              </span>
            </div>

            <div className="flex gap-6 items-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">Total Despesas Selecionadas</span>
                <span className="text-base font-extrabold text-red-600">
                  R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">Total Receitas Selecionadas</span>
                <span className="text-base font-extrabold text-green-600">
                  R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Grid list of transactions */}
          <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <th className="py-4 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={Object.values(selectedTxs).length > 0 && Object.values(selectedTxs).every(Boolean)}
                        onChange={(e) => {
                          const val = e.target.checked
                          const map: Record<number, boolean> = {}
                          extractedTxs.forEach((_, idx) => {
                            map[idx] = val
                          })
                          setSelectedTxs(map)
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-4 px-3 w-36">Data</th>
                    <th className="py-4 px-3">Descrição</th>
                    <th className="py-4 px-3 w-32">Valor (R$)</th>
                    <th className="py-4 px-3 w-28">Tipo</th>
                    <th className="py-4 px-3 w-44">Categoria</th>
                    <th className="py-4 px-3 w-44">Seção</th>
                    <th className="py-4 px-3 w-16 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {extractedTxs.map((tx, index) => {
                    const isDuplicate = checkIsDuplicate(tx)
                    const isSelected = !!selectedTxs[index]

                    return (
                      <tr
                        key={index}
                        className={`hover:bg-gray-50/30 dark:hover:bg-gray-700/10 transition-colors ${
                          isDuplicate && 'bg-yellow-50/20 dark:bg-yellow-950/5'
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedTxs((prev) => ({ ...prev, [index]: e.target.checked }))
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="date"
                            value={tx.date}
                            onChange={(e) => handleGridChange(index, 'date', e.target.value)}
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white dark:focus:bg-gray-800 rounded px-1.5 py-0.5 text-sm"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <input
                              type="text"
                              value={tx.description}
                              onChange={(e) => handleGridChange(index, 'description', e.target.value)}
                              className="w-full bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white dark:focus:bg-gray-800 rounded px-1.5 py-0.5 text-sm font-medium text-gray-850 dark:text-gray-200"
                            />
                            {isDuplicate && (
                              <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold flex items-center gap-1 ml-1.5">
                                <AlertTriangle size={10} />
                                Provável Duplicada (mesma data/valor)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            step="0.01"
                            value={tx.amount || ''}
                            onChange={(e) => handleGridChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white dark:focus:bg-gray-800 rounded px-1.5 py-0.5 text-sm font-semibold text-gray-800 dark:text-gray-250"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleGridChange(index, 'type', tx.type === 'income' ? 'expense' : 'income')}
                            className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              tx.type === 'income'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {tx.type === 'income' ? 'Receita' : 'Despesa'}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={tx.category}
                            onChange={(e) => handleGridChange(index, 'category', e.target.value as Category)}
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white dark:focus:bg-gray-800 rounded px-1.5 py-0.5 text-sm cursor-pointer"
                          >
                            {Object.keys(Category).map((catKey) => {
                              const meta = CATEGORY_META[catKey as Category]
                              return (
                                <option key={catKey} value={catKey} className="dark:bg-gray-850">
                                  {meta?.label || catKey}
                                </option>
                              )
                            })}
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={tx.section}
                            onChange={(e) => handleGridChange(index, 'section', e.target.value)}
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white dark:focus:bg-gray-800 rounded px-1.5 py-0.5 text-sm cursor-pointer"
                          >
                            {activeSections.map((sec) => (
                              <option key={sec.id} value={sec.id} className="dark:bg-gray-850">
                                {sec.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteTx(index)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Remover transação"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex gap-4 items-center justify-end">
            <button
              onClick={() => {
                setExtractedTxs([])
                setFile(null)
              }}
              className="px-6 py-3 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl text-sm font-semibold transition-all cursor-pointer"
            >
              Descartar e Voltar
            </button>
            <button
              onClick={handleImportConfirm}
              disabled={loading || !extractedTxs.some((_, index) => selectedTxs[index])}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando Lançamentos...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Importar Transações
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Doubts/Questions Modal (Caixa de Dúvidas da IA) */}
      {showQuestionsModal && questions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-3xl p-6 shadow-2xl animate-scale-in flex flex-col gap-6">
            
            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20">
                <HelpCircle size={20} className="text-purple-600 dark:text-purple-400 animate-bounce" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-gray-100">
                  Dúvidas da Inteligência Artificial
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ajude a IA a categorizar melhor algumas transações ambíguas
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>

            {/* Stepper progress bar */}
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Body */}
            <div className="flex flex-col gap-4 bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-850 p-5 rounded-2xl">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transação Original</span>
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 px-3 py-2 rounded-xl truncate">
                  {questions[currentQuestionIndex]?.transactionRaw}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pergunta</span>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                  {questions[currentQuestionIndex]?.question}
                </p>
              </div>
            </div>

            {/* Options list */}
            <div className="flex flex-col gap-2.5">
              {questions[currentQuestionIndex]?.options.map((option, idx) => {
                const label =
                  questions[currentQuestionIndex]?.property === 'category'
                    ? CATEGORY_META[option as Category]?.label || option
                    : activeSections.find((s) => s.id === option)?.label || option

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerQuestion(option)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-purple-50/50 dark:bg-gray-800/40 dark:hover:bg-purple-950/20 border border-gray-200 hover:border-purple-300 dark:border-white/10 dark:hover:border-purple-800/30 rounded-2xl text-sm font-semibold text-gray-700 hover:text-purple-700 dark:text-gray-300 dark:hover:text-purple-300 transition-all duration-200 cursor-pointer text-left group"
                  >
                    <span>{label}</span>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                  </button>
                )
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleSkipQuestion}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
              >
                Ignorar esta pergunta
              </button>
              <button
                onClick={handleSkipAllQuestions}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-350 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Ignorar todas as perguntas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
