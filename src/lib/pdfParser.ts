import { UploadedFile, ParsedIRData, parseIRDocument } from '../utils/pdfExtractors'

export type { UploadedFile, ParsedIRData }

export async function uploadFile(file: File): Promise<UploadedFile> {
  const uploadedFile: UploadedFile = {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
    status: 'processing',
  }

  try {
    // Verificar tipo do arquivo
    if (file.type !== 'application/pdf') {
      throw new Error('Apenas arquivos PDF são permitidos')
    }

    // Limite de 10MB
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. Máximo 10MB')
    }

    // Extrair texto do PDF
    const text = await extractTextFromPDF(file)
    
    // Parsear dados do IR
    const parsedData = parseIRDocument(text, file.name)
    
    uploadedFile.status = 'success'
    uploadedFile.parsedData = parsedData
    
  } catch (error) {
    uploadedFile.status = 'error'
    uploadedFile.errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
  }

  return uploadedFile
}

import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    fullText += pageText + '\n'
  }
  
  return fullText
}

// Analisar dados extraídos e sugerir integração com dados do app
export function analyzeParsedData(
  parsedData: ParsedIRData,
  appTransactions: Array<{ amount: number; description: string; monthKey: string }>
): {
  matchedTransactions: number
  missingInApp: Array<{ type: string; value: number; description: string; monthKey?: string }>
  discrepancies: Array<{ type: string; appValue: number; documentValue: number; difference: number }>
} {
  const matchedTransactions: number[] = []
  const missingInApp: ParsedIRData['incomeItems'] = []
  const discrepancies: Array<{ type: string; appValue: number; documentValue: number; difference: number }> = []
  
  // Agrupar transações do app por tipo
  for (const item of parsedData.incomeItems) {
    const appMatches = appTransactions.filter(t => 
      t.description.toLowerCase().includes(item.type === 'SALARIO' ? 'salário' : item.type.toLowerCase().replace('_', ' '))
    )
    
    if (appMatches.length > 0) {
      matchedTransactions.push(appMatches.length)
    } else {
      missingInApp.push(item)
    }
  }
  
  // Calcular diferenças
  const appSalaryTotal = appTransactions
    .filter(t => t.description.toLowerCase().includes('salário'))
    .reduce((sum, t) => sum + t.amount, 0)
    
  if (appSalaryTotal > 0 && parsedData.taxableIncome > 0) {
    const diff = Math.abs(appSalaryTotal - parsedData.taxableIncome)
    if (diff > 100) { // Only flag significant differences
      discrepancies.push({
        type: 'Salário',
        appValue: appSalaryTotal,
        documentValue: parsedData.taxableIncome,
        difference: diff,
      })
    }
  }
  
  return {
    matchedTransactions: matchedTransactions.length,
    missingInApp,
    discrepancies,
  }
}