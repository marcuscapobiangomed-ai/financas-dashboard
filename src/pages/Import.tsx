import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Upload, FileText, Sparkles, Check, AlertCircle, AlertTriangle,
  Loader2, Trash2, Edit2, CheckCircle2, ChevronRight, HelpCircle,
  Clock
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useFinanceStore } from '../store/useFinanceStore'
import { extractTextFromPDF } from '../lib/pdfParser'
import { parseDocumentWithAI, ParsedTransaction, ParsingQuestion } from '../lib/geminiApi'
import { Category, CATEGORY_META } from '../types/category'

function cleanAndCompressCSV(rawCsv: string): string {
  const lines = rawCsv.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) return '';
  
  const firstLine = lines[0];
  const sep = firstLine.includes(';') ? ';' : ',';
  
  let dateIdx = -1;
  let descIdx = -1;
  let valIdx = -1;
  
  let headerRowIdx = -1;
  const dateKeywords = ['data', 'date', 'dt'];
  const descKeywords = ['desc', 'hist', 'detalhe', 'transa', 'nome', 'estabelecimento', 'mercado', 'merchant'];
  const valKeywords = ['valor', 'amount', 'monto', 'val', 'preço', 'preco', 'total', 'quant', 'r$'];
  
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cols = lines[i].split(sep).map(c => c.trim().toLowerCase());
    let dIdx = cols.findIndex(c => dateKeywords.some(k => c.includes(k)));
    let dsIdx = cols.findIndex(c => !c.includes('id') && descKeywords.some(k => c.includes(k)));
    let vIdx = cols.findIndex(c => valKeywords.some(k => c.includes(k)));
    
    if (dIdx !== -1 && dsIdx !== -1 && vIdx !== -1) {
      dateIdx = dIdx;
      descIdx = dsIdx;
      valIdx = vIdx;
      headerRowIdx = i;
      break;
    }
  }
  
  if (dateIdx === -1 || descIdx === -1 || valIdx === -1) {
    const sampleRow = lines.find(line => line.split(sep).length >= 3);
    if (sampleRow) {
      const cols = sampleRow.split(sep).map(c => c.trim());
      const dateRegex = /\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/;
      const tempDateIdx = cols.findIndex(c => dateRegex.test(c));
      
      const valRegex = /[-+]?\s*R?\$\s*\d+([.,]\d+)?/;
      const numberRegex = /^-?\d+([.,]\d+)?$/;
      const tempValIdx = cols.findIndex(c => valRegex.test(c) || numberRegex.test(c.replace(/\s/g, '')));
      
      let tempDescIdx = -1;
      let maxLen = 0;
      for (let k = 0; k < cols.length; k++) {
        if (k !== tempDateIdx && k !== tempValIdx) {
          if (cols[k].length > maxLen) {
            maxLen = cols[k].length;
            tempDescIdx = k;
          }
        }
      }
      
      if (tempDateIdx !== -1 && tempValIdx !== -1 && tempDescIdx !== -1) {
        dateIdx = tempDateIdx;
        descIdx = tempDescIdx;
        valIdx = tempValIdx;
      }
    }
  }
  
  if (dateIdx === -1 || descIdx === -1 || valIdx === -1) {
    return lines.join('\n');
  }
  
  const compressedLines: string[] = ['Data,Descricao,Valor'];
  const startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
  
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    if (cols.length <= Math.max(dateIdx, descIdx, valIdx)) continue;
    
    const dateVal = cols[dateIdx].trim();
    const descVal = cols[descIdx].trim().replace(/["']/g, '');
    const amountVal = cols[valIdx].trim();
    
    if (!dateVal || !descVal || !amountVal) continue;
    
    compressedLines.push(`"${dateVal}","${descVal}","${amountVal}"`);
  }
  
  return compressedLines.join('\n');
}

function applyAdaptiveLearning(
  extracted: ParsedTransaction[],
  userHistory: any[],
  questions: ParsingQuestion[]
): { transactions: ParsedTransaction[]; questions: ParsingQuestion[] } {
  const history = [...userHistory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 150);

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const historyMap = new Map<string, Array<{ category: string; section: string; type: string }>>();
  
  history.forEach(tx => {
    if (!tx.description) return;
    const norm = normalize(tx.description);
    if (!norm) return;
    
    if (!historyMap.has(norm)) {
      historyMap.set(norm, []);
    }
    historyMap.get(norm)!.push({
      category: tx.category,
      section: tx.section,
      type: tx.type
    });
  });

  const getMostFrequent = (choices: Array<{ category: string; section: string; type: string }>) => {
    const counts: Record<string, { category: string; section: string; type: string; count: number }> = {};
    let maxCount = 0;
    let best = choices[0];
    
    choices.forEach(c => {
      const key = `${c.category}|${c.section}|${c.type}`;
      if (!counts[key]) {
        counts[key] = { ...c, count: 0 };
      }
      counts[key].count++;
      if (counts[key].count > maxCount) {
        maxCount = counts[key].count;
        best = counts[key];
      }
    });
    
    return best;
  };

  const resolvedIndices = new Set<number>();
  
  const updatedTransactions = extracted.map((tx, index) => {
    const normDesc = normalize(tx.description);
    if (!normDesc) return tx;
    
    let matchChoices = historyMap.get(normDesc);
    
    if (!matchChoices && normDesc.length >= 4) {
      for (const [key, choices] of historyMap.entries()) {
        if (key.length >= 4 && (normDesc.includes(key) || key.includes(normDesc))) {
          matchChoices = choices;
          break;
        }
      }
    }
    
    if (matchChoices && matchChoices.length > 0) {
      const bestMatch = getMostFrequent(matchChoices);
      resolvedIndices.add(index);
      return {
        ...tx,
        category: bestMatch.category as any,
        section: bestMatch.section,
        type: bestMatch.type as any,
        confidence: 100
      };
    }
    
    return tx;
  });

  const filteredQuestions = questions.filter(q => !resolvedIndices.has(q.transactionIndex));

  return {
    transactions: updatedTransactions,
    questions: filteredQuestions
  };
}

function preMatchTransactions(
  compressedText: string,
  userHistory: any[]
): { matched: ParsedTransaction[]; unmatchedCsv: string } {
  const lines = compressedText.split('\n')
  if (lines.length <= 1) return { matched: [], unmatchedCsv: '' }

  const header = lines[0]
  const dataLines = lines.slice(1).filter(l => l.trim().length > 0)

  const history = [...userHistory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 150)

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim()
  }

  const historyMap = new Map<string, Array<{ category: string; section: string; type: string }>>()
  history.forEach(tx => {
    if (!tx.description) return
    const norm = normalize(tx.description)
    if (!norm) return
    if (!historyMap.has(norm)) historyMap.set(norm, [])
    historyMap.get(norm)!.push({
      category: tx.category,
      section: tx.section,
      type: tx.type
    })
  })

  const getMostFrequent = (choices: Array<{ category: string; section: string; type: string }>) => {
    const counts: Record<string, { category: string; section: string; type: string; count: number }> = {}
    let maxCount = 0
    let best = choices[0]
    choices.forEach(c => {
      const key = `${c.category}|${c.section}|${c.type}`
      if (!counts[key]) counts[key] = { ...c, count: 0 }
      counts[key].count++
      if (counts[key].count > maxCount) {
        maxCount = counts[key].count
        best = counts[key]
      }
    })
    return best
  }

  const formatDateToYMD = (dateStr: string): string => {
    const clean = dateStr.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
    
    const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
    if (dmyMatch) {
      let day = dmyMatch[1].padStart(2, '0')
      let month = dmyMatch[2].padStart(2, '0')
      let year = dmyMatch[3]
      if (year.length === 2) {
        year = '20' + year
      }
      return `${year}-${month}-${day}`
    }
    return clean
  }

  const matched: ParsedTransaction[] = []
  const unmatchedRows: string[] = []

  dataLines.forEach(line => {
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',')
    const cols = matches.map(c => c.replace(/^["']|["']$/g, '').trim())

    if (cols.length < 3) return

    const dateVal = cols[0]
    const descVal = cols[1]
    const amountVal = cols[2]

    const cleanAmount = parseFloat(amountVal.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0

    const normDesc = normalize(descVal)
    let matchChoices = historyMap.get(normDesc)

    if (!matchChoices && normDesc.length >= 4) {
      for (const [key, choices] of historyMap.entries()) {
        if (key.length >= 4 && (normDesc.includes(key) || key.includes(normDesc))) {
          matchChoices = choices
          break
        }
      }
    }

    if (matchChoices && matchChoices.length > 0) {
      const bestMatch = getMostFrequent(matchChoices)
      matched.push({
        date: formatDateToYMD(dateVal),
        type: bestMatch.type as any,
        section: bestMatch.section,
        description: descVal,
        amount: cleanAmount,
        category: bestMatch.category as any,
        confidence: 100
      })
    } else {
      unmatchedRows.push(line)
    }
  })

  const unmatchedCsv = unmatchedRows.length > 0 ? [header, ...unmatchedRows].join('\n') : ''

  return {
    matched,
    unmatchedCsv
  }
}

function parseResetTokensToSeconds(resetStr: string): number {
  if (!resetStr) return 0;
  let seconds = 0;
  const minutesMatch = resetStr.match(/(\d+)m/);
  if (minutesMatch) {
    seconds += parseInt(minutesMatch[1]) * 60;
  }
  const secondsMatch = resetStr.match(/(\d+(?:\.\d+)?)s/);
  if (secondsMatch) {
    const isMs = resetStr.includes('ms') && !resetStr.match(/\d+s/);
    if (!isMs) {
      seconds += parseFloat(secondsMatch[1]);
    }
  }
  const msMatch = resetStr.match(/(\d+)ms/);
  if (msMatch) {
    seconds += parseInt(msMatch[1]) / 1000;
  }
  return Math.ceil(seconds);
}

export function Import() {
  const navigate = useNavigate()
  const appSettings = useFinanceStore((s) => s.appSettings)
  const transactions = useFinanceStore((s) => s.transactions)
  const addTransactions = useFinanceStore((s) => s.addTransactions)

  // API Key (supports Groq and Gemini keys)
  const geminiApiKey = appSettings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GROQ_API_KEY || ''

  const [activeProvider, setActiveProvider] = useState<'Gemini' | 'Groq' | null>(null)

  useEffect(() => {
    if (geminiApiKey) {
      setActiveProvider(geminiApiKey.startsWith('gsk_') ? 'Groq' : 'Gemini')
    } else {
      setActiveProvider('Gemini')
    }
  }, [geminiApiKey])

  // UI States
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Token tracking states
  const [tokensSpent, setTokensSpent] = useState<number>(0)
  const [tokensLimit, setTokensLimit] = useState<number>(0)
  const [tokensRemaining, setTokensRemaining] = useState<number>(0)
  const [resetSeconds, setResetSeconds] = useState<number>(0)

  // Initialize countdown from localStorage on mount
  useEffect(() => {
    const expiryStr = localStorage.getItem('groq_rate_limit_expiry')
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10)
      const remaining = Math.ceil((expiry - Date.now()) / 1000)
      if (remaining > 0) {
        setResetSeconds(remaining)
      } else {
        localStorage.removeItem('groq_rate_limit_expiry')
      }
    }
  }, [])

  // Timer countdown and localStorage sync
  useEffect(() => {
    if (resetSeconds <= 0) {
      localStorage.removeItem('groq_rate_limit_expiry')
      return
    }

    const timer = setInterval(() => {
      setResetSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          localStorage.removeItem('groq_rate_limit_expiry')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [resetSeconds])

  // Helper to trigger cooldown and save to localStorage
  const triggerCooldown = (seconds: number) => {
    if (seconds <= 0) return
    setResetSeconds(seconds)
    localStorage.setItem('groq_rate_limit_expiry', (Date.now() + seconds * 1000).toString())
  }

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
        const cleanLines = csv
          .split('\n')
          .map(line => line.trim())
          .filter(line => {
            if (!line) return false
            // Remove todos os delimitadores e espaços em branco para checar se a linha tem conteúdo real
            const withoutSeparators = line.replace(/[,;\t|\s]/g, '')
            return withoutSeparators.length > 0
          })
        if (cleanLines.length > 0) {
          text += `--- Planilha: ${sheetName} ---\n${cleanLines.join('\n')}\n\n`
        }
      }
      console.log('Tamanho do texto extraído da planilha:', text.length, 'caracteres')
      return text
    } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setLoadingStep('Lendo arquivo CSV...')
      const rawText = await file.text()
      const cleanLines = rawText
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          if (!line) return false
          const withoutSeparators = line.replace(/[,;\t|\s]/g, '')
          return withoutSeparators.length > 0
        })
      const cleanCsv = cleanLines.join('\n')
      console.log('Tamanho do texto extraído do CSV:', cleanCsv.length, 'caracteres')
      return cleanCsv
    } else {
      throw new Error('Formato de arquivo não suportado. Use PDF, Excel (.xlsx, .xls) ou CSV.')
    }
  }

  // AI Processing Trigger
  async function handleAnalyze() {
    if (!file) return

    setLoading(true)
    setError(null)
    setExtractedTxs([])
    setQuestions([])
    setSelectedTxs({})

    try {
      setLoadingStep('Lendo arquivo selecionado...')
      const text = await extractText(file)

      let rawTransactions: ParsedTransaction[] = []
      let rawQuestions: ParsingQuestion[] = []

      let accumSpent = 0
      let lastLimit = 0
      let lastRemaining = 0
      let lastReset = ''

      const isSheetOrCsv = file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

      if (isSheetOrCsv) {
        setLoadingStep('Comprimindo e mapeando dados localmente...')
        const compressedText = cleanAndCompressCSV(text)
        
        // Mapeia transações locais conhecidas antes de enviar para a IA
        const { matched, unmatchedCsv } = preMatchTransactions(compressedText, transactions)
        
        // Inicializa com as transações correspondidas localmente
        rawTransactions.push(...matched)

        if (unmatchedCsv) {
          const lines = unmatchedCsv.split('\n')
          const header = lines[0]
          const unmatchedRows = lines.slice(1).filter(l => l.trim().length > 0)
          
          const isGroq = geminiApiKey.startsWith('gsk_')
          const batchSize = isGroq ? 15 : unmatchedRows.length
          const totalBatches = Math.ceil(unmatchedRows.length / batchSize)
          
          for (let b = 0; b < totalBatches; b++) {
            if (b > 0 && isGroq) {
              setLoadingStep(`Aguardando intervalo de segurança anti Rate-Limit (4s)...`)
              await new Promise(resolve => setTimeout(resolve, 4000))
            }
            
            const batchRows = unmatchedRows.slice(b * batchSize, (b + 1) * batchSize)
            const batchText = [header, ...batchRows].join('\n')
            
            if (isGroq) {
              setLoadingStep(`Analisando lote ${b + 1} de ${totalBatches} (${Math.round(((b + 1) / totalBatches) * 100)}%)...`)
            } else {
              setLoadingStep('Enviando dados para análise rápida do Gemini...')
            }
            
            const result = await parseDocumentWithAI(geminiApiKey, batchText, isGroq ? `${file.name} (Lote ${b + 1})` : file.name, activeSections)
            
            if (result.provider) {
              setActiveProvider(result.provider === 'gemini' ? 'Gemini' : 'Groq')
            }
            if (result.usage) {
              accumSpent += result.usage.totalTokens
            }
            if (result.rateLimits) {
              if (result.rateLimits.limitTokens) lastLimit = parseInt(result.rateLimits.limitTokens) || 0
              if (result.rateLimits.remainingTokens) lastRemaining = parseInt(result.rateLimits.remainingTokens) || 0
              if (result.rateLimits.resetTokens) lastReset = result.rateLimits.resetTokens
            }

            const txOffset = rawTransactions.length
            
            const adjustedQuestions = (result.questions || []).map(q => ({
              ...q,
              transactionIndex: q.transactionIndex + txOffset
            }))
            
            rawTransactions.push(...(result.transactions || []))
            rawQuestions.push(...adjustedQuestions)
          }
        }
      } else {
        setLoadingStep('Enviando dados para análise da Inteligência Artificial...')
        const result = await parseDocumentWithAI(geminiApiKey, text, file.name, activeSections)
        rawTransactions = result.transactions || []
        rawQuestions = result.questions || []
        
        if (result.provider) {
          setActiveProvider(result.provider === 'gemini' ? 'Gemini' : 'Groq')
        }
        if (result.usage) {
          accumSpent = result.usage.totalTokens
        }
        if (result.rateLimits) {
          if (result.rateLimits.limitTokens) lastLimit = parseInt(result.rateLimits.limitTokens) || 0
          if (result.rateLimits.remainingTokens) lastRemaining = parseInt(result.rateLimits.remainingTokens) || 0
          if (result.rateLimits.resetTokens) lastReset = result.rateLimits.resetTokens
        }
      }

      setLoadingStep('Aplicando aprendizado adaptativo local...')
      const optimized = applyAdaptiveLearning(rawTransactions, transactions, rawQuestions)

      setExtractedTxs(optimized.transactions)
      setTokensSpent(accumSpent)
      if (lastLimit) setTokensLimit(lastLimit)
      if (lastRemaining) setTokensRemaining(lastRemaining)
      if (lastReset) triggerCooldown(parseResetTokensToSeconds(lastReset))
      
      // Auto-select non-duplicate transactions
      const selectionMap: Record<number, boolean> = {}
      optimized.transactions.forEach((tx, index) => {
        const isDuplicate = checkIsDuplicate(tx)
        selectionMap[index] = !isDuplicate
      })
      setSelectedTxs(selectionMap)

      if (optimized.questions && optimized.questions.length > 0) {
        setQuestions(optimized.questions)
        setCurrentQuestionIndex(0)
        setShowQuestionsModal(true)
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Ocorreu um erro ao processar o documento.')

      if (err?.rateLimits) {
        if (err.rateLimits.limitTokens) setTokensLimit(parseInt(err.rateLimits.limitTokens) || 0)
        if (err.rateLimits.remainingTokens) setTokensRemaining(parseInt(err.rateLimits.remainingTokens) || 0)
        if (err.rateLimits.resetTokens) triggerCooldown(parseResetTokensToSeconds(err.rateLimits.resetTokens))
      } else {
        const errorMsg = err?.message || ''
        const tryAgainMatch = errorMsg.match(/try again in (\d+(?:\.\d+)?)s/i)
        if (tryAgainMatch) {
          const seconds = Math.ceil(parseFloat(tryAgainMatch[1]))
          triggerCooldown(seconds)
        }
      }
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
      const mapped = toImport.map((t) => {
        const { confidence, ...cleanT } = t as any
        return {
          ...cleanT,
          id: crypto.randomUUID(),
          monthKey: t.date.substring(0, 7),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
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
  const stats = useMemo(() => {
    let income = 0
    let expense = 0
    let duplicateCount = 0
    let totalConfidence = 0
    let confidenceCount = 0
    const categoryTotals: Record<string, number> = {}

    extractedTxs.forEach((tx, index) => {
      const isDup = checkIsDuplicate(tx)
      if (isDup) {
        duplicateCount++
      }

      if (selectedTxs[index]) {
        if (tx.type === 'income') {
          income += tx.amount
        } else {
          expense += tx.amount
          categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount
        }

        if (tx.confidence !== undefined) {
          totalConfidence += tx.confidence
          confidenceCount++
        }
      }
    })

    const netValue = income - expense
    const avgConfidence = confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 100

    const topCategories = Object.entries(categoryTotals)
      .map(([cat, amount]) => ({
        category: cat as Category,
        amount
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)

    return {
      income,
      expense,
      netValue,
      duplicateCount,
      avgConfidence,
      topCategories
    }
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

      {/* Cotas e Estatísticas da IA */}
      <div className="bg-white/40 dark:bg-gray-800/20 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-850 dark:text-gray-100">Estatísticas da API de IA</h3>
            <p className="text-xs text-gray-500">Acompanhamento de consumo e cotas de processamento</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          {/* Provedor Ativo */}
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Provedor Ativo</span>
            {activeProvider === 'Gemini' ? (
              <span id="ai-provider-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border border-green-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Gemini (Recomendado)
              </span>
            ) : activeProvider === 'Groq' ? (
              <span id="ai-provider-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                Groq
              </span>
            ) : (
              <span id="ai-provider-badge" className="text-sm font-bold text-gray-500">
                Detectando...
              </span>
            )}
          </div>

          {/* Tokens Gasto no Último Envio */}
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Consumo na Sessão</span>
            <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400">
              {tokensSpent.toLocaleString('pt-BR')} tokens
            </span>
          </div>

          {/* Limite Restante */}
          {tokensLimit > 0 && (
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Tokens Disponíveis</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-250">
                {tokensRemaining.toLocaleString('pt-BR')} / {tokensLimit.toLocaleString('pt-BR')}
              </span>
            </div>
          )}

          {/* Relógio / Próxima Importação */}
          <div className="flex items-center">
            {resetSeconds > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl animate-pulse">
                <Clock size={16} className="text-red-500 animate-spin-slow" style={{ animationDuration: '4s' }} />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-red-500">Próxima Importação</span>
                  <span className="text-xs font-extrabold font-mono leading-none">
                    {Math.floor(resetSeconds / 60).toString().padStart(2, '0')}:{(resetSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            ) : tokensSpent > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 text-green-600 dark:text-green-400 rounded-2xl">
                <Clock size={16} className="text-green-500" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-green-500">Próxima Importação</span>
                  <span className="text-xs font-extrabold leading-none">Liberada</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-white/5 text-gray-600 dark:text-gray-400 rounded-2xl">
                <Clock size={16} className="text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-gray-400">Próxima Importação</span>
                  <span className="text-xs font-semibold leading-none">Pronto para uso</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



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
              disabled={loading}
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
                  className="text-sm font-semibold cursor-pointer text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
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
              disabled={loading || resetSeconds > 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {loadingStep}
                </>
              ) : resetSeconds > 0 ? (
                <>
                  <Clock size={18} className="animate-pulse" />
                  Aguarde {Math.floor(resetSeconds / 60).toString().padStart(2, '0')}:{(resetSeconds % 60).toString().padStart(2, '0')} para analisar novamente
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
          {/* Document Name Banner */}
          <div className="flex items-center justify-between px-6 py-3 bg-white/30 dark:bg-gray-800/20 backdrop-blur-xl border border-gray-200/40 dark:border-white/5 rounded-2xl">
            <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
              <FileText size={14} className="text-gray-400" />
              Arquivo: <strong className="text-gray-750 dark:text-gray-200">{file?.name}</strong>
            </span>
            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 dark:bg-gray-800/60 px-2 py-0.5 rounded-md">
              {extractedTxs.length} transações processadas
            </span>
          </div>

          {/* Stats Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Saldo Final */}
            <div className="bg-gradient-to-br from-white/60 to-white/40 dark:from-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl p-5 shadow-lg flex flex-col justify-between min-h-[120px] transition-all hover:translate-y-[-2px] hover:shadow-xl duration-200">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Saldo a Importar</span>
              <div className="mt-2">
                <span className={`text-2xl font-extrabold ${stats.netValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  R$ {stats.netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="flex gap-2.5 text-[10px] text-gray-400 mt-1">
                  <span>Rec: <strong className="text-green-600/80">R$ {stats.income.toLocaleString('pt-BR')}</strong></span>
                  <span>Desp: <strong className="text-red-600/80">R$ {stats.expense.toLocaleString('pt-BR')}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 2: Controle de Duplicatas */}
            <div className="bg-gradient-to-br from-white/60 to-white/40 dark:from-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl p-5 shadow-lg flex flex-col justify-between min-h-[120px] transition-all hover:translate-y-[-2px] hover:shadow-xl duration-200">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Controle de Duplicatas</span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-extrabold text-gray-800 dark:text-gray-150">
                    {stats.duplicateCount}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Duplicadas auto-desmarcadas
                  </p>
                </div>
                {stats.duplicateCount > 0 ? (
                  <div className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-950/30 text-yellow-750 dark:text-yellow-400 text-[10px] font-bold rounded-full border border-yellow-250/20">
                    Evitado
                  </div>
                ) : (
                  <div className="px-2.5 py-1 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-250/20">
                    Limpo
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Média de Confiança */}
            <div className="bg-gradient-to-br from-white/60 to-white/40 dark:from-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl p-5 shadow-lg flex flex-col justify-between min-h-[120px] transition-all hover:translate-y-[-2px] hover:shadow-xl duration-200">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Média de Confiança</span>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-extrabold ${stats.avgConfidence >= 90 ? 'text-green-600 dark:text-green-400' : stats.avgConfidence >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stats.avgConfidence}%
                  </span>
                  <span className="text-[10px] text-gray-400">segurança</span>
                </div>
                {/* Micro progress bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stats.avgConfidence >= 90 ? 'bg-green-500' : stats.avgConfidence >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${stats.avgConfidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Distribuição de Gastos */}
            <div className="bg-gradient-to-br from-white/60 to-white/40 dark:from-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl p-5 shadow-lg flex flex-col justify-between min-h-[120px] transition-all hover:translate-y-[-2px] hover:shadow-xl duration-200">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Principais Categorias</span>
              <div className="mt-2 flex flex-col gap-1">
                {stats.topCategories.length > 0 ? (
                  stats.topCategories.map((item, idx) => {
                    const meta = CATEGORY_META[item.category]
                    const label = meta?.label || item.category
                    const color = meta?.color || '#a855f7'
                    return (
                      <div key={idx} className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-600 dark:text-gray-300 font-medium truncate max-w-[90px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {label}
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 font-bold">
                          R$ {item.amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <span className="text-[10px] text-gray-400 italic">Sem despesas</span>
                )}
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
                              <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold flex items-center gap-1 ml-1.5 mt-0.5">
                                <AlertTriangle size={10} />
                                Provável Duplicada (mesma data/valor)
                              </span>
                            )}
                            {tx.confidence !== undefined && tx.confidence < 85 && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 ml-1.5 mt-0.5">
                                <AlertTriangle size={10} />
                                Baixa Confiança ({tx.confidence}%)
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
