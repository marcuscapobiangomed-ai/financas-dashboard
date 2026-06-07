export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  status: 'processing' | 'success' | 'error'
  errorMessage?: string
  parsedData?: ParsedIRData
}

export interface ParsedIRData {
  sourceBank?: string
  year: number
  cnpj?: string
  employeeName?: string
  totalIncome: number
  taxableIncome: number
  exemptIncome: number
  taxWithheld: number
  incomeItems: Array<{
    type: 'SALARIO' | 'FERIAS' | '13_SALARIO' | 'PLR' | 'ABONO' | 'OUTROS'
    description: string
    value: number
    isTaxable: boolean
    isExempt: boolean
  }>
  confidence: number // 0-100, quanto maior mais confiante
}

export function parseNumber(str: string | undefined): number {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.').replace(/[R$\s]/g, '')) || 0
}

export function parseIRDocument(text: string, filename: string): ParsedIRData {
  const textLower = text.toLowerCase()
  
  // Extrair ano do filename ou do conteúdo
  const yearMatch = filename.match(/(20\d{2})/) || text.match(/ano\s*base[^\d]*(20\d{2})/i)
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear() - 1
  
  // Detectar banco emissor
  const banks = ['itau', 'bradesco', 'santander', 'banco do brasil', 'caixa', 'nubank', 'inter', 'xp', 'safra', 'modal']
  let detectedBank = 'Banco Desconhecido'
  for (const bank of banks) {
    if (textLower.includes(bank)) {
      detectedBank = bank.charAt(0).toUpperCase() + bank.slice(1)
      break
    }
  }
  
  // Tentar extrair CNPJ
  const cnpjMatch = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)
  const cnpj = cnpjMatch ? cnpjMatch[0] : undefined
  
  // Extrair nome do funcionário
  const nameMatch = text.match(/(?:nome|funcionário|empregado)[\s:]+([A-Za-z\s]+?)(?:\n|CNPJ|$)/i)
  const employeeName = nameMatch ? nameMatch[1].trim() : undefined
  
  // Tentar encontrar valores totais
  const totalIncomeMatch = text.match(/(?:renda|rendimento)[\s]*(?:bruta|total)[\s]*(?:anual)?[\s:]*R?\$?\s*([\d.,]+)/i)
  const taxableIncomeMatch = text.match(/(?:renda|rendimento)[\s]*(?:tributável|tributável)[\s]*R?\$?\s*([\d.,]+)/i)
  const exemptIncomeMatch = text.match(/(?:renda|rendimento)[\s]*(?:isento|isenta)[\s]*R?\$?\s*([\d.,]+)/i)
  const taxWithheldMatch = text.match(/(?:ir|imposto)[\s]*(?:retido|descontado)[\s]*R?\$?\s*([\d.,]+)/i)
  
  const totalIncome = parseNumber(totalIncomeMatch?.[1])
  const taxableIncome = parseNumber(taxableIncomeMatch?.[1])
  const exemptIncome = parseNumber(exemptIncomeMatch?.[1])
  const taxWithheld = parseNumber(taxWithheldMatch?.[1])
  
  // Tentar extrair itens específicos de rendimento
  const incomeItems: ParsedIRData['incomeItems'] = []
  
  // Salary patterns
  const salaryPatterns = [
    /(?:salário|vencimento|remuneração)[\s:]*R?\$?\s*([\d.,]+)/gi,
    /(?:salário|vencimento|remuneração)[\s]*mensal[\s:]*R?\$?\s*([\d.,]+)/gi,
  ]
  
  for (const pattern of salaryPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      incomeItems.push({
        type: 'SALARIO',
        description: 'Salário Mensal',
        value: parseNumber(match[1]),
        isTaxable: true,
        isExempt: false,
      })
    }
  }
  
  // 13th salary
  if (textLower.includes('13º') || textLower.includes('décimo terceiro') || textLower.includes('13salário')) {
    const match = text.match(/(?:13º|decimo)[\s]*(?:salário|terceiro)[\s:]*R?\$?\s*([\d.,]+)/i)
    if (match) {
      incomeItems.push({
        type: '13_SALARIO',
        description: '13º Salário',
        value: parseNumber(match[1]),
        isTaxable: true,
        isExempt: false,
      })
    }
  }
  
  // PLR
  if (textLower.includes('plr') || textLower.includes('participação nos lucros')) {
    const match = text.match(/(?:plr|participação[\s]nos[\s]lucros)[\s:]*R?\$?\s*([\d.,]+)/i)
    if (match) {
      incomeItems.push({
        type: 'PLR',
        description: 'Participação nos Lucros',
        value: parseNumber(match[1]),
        isTaxable: true,
        isExempt: false,
      })
    }
  }
  
  // Vacation
  if (textLower.includes('férias') || textLower.includes('ferias')) {
    const match = text.match(/ferias[\s:]*R?\$?\s*([\d.,]+)/i)
    if (match) {
      incomeItems.push({
        type: 'FERIAS',
        description: 'Férias',
        value: parseNumber(match[1]),
        isTaxable: false,
        isExempt: true,
      })
    }
  }
  
  // Calcular confiança baseada em quantos campos foram encontrados
  let confidence = 0
  if (totalIncome > 0) confidence += 20
  if (taxableIncome > 0) confidence += 20
  if (employeeName) confidence += 20
  if (cnpj) confidence += 20
  if (incomeItems.length > 0) confidence += 20
  
  return {
    sourceBank: detectedBank,
    year,
    cnpj,
    employeeName,
    totalIncome: totalIncome || taxableIncome + exemptIncome,
    taxableIncome,
    exemptIncome,
    taxWithheld,
    incomeItems,
    confidence,
  }
}
