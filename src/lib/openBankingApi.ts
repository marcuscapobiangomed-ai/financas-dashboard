import { BankConnection } from './openBanking'

function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl) {
    throw new Error('API URL não configurada. Configure VITE_API_URL no arquivo .env')
  }
  return apiUrl
}

export interface Account {
  id: string
  type: 'CONTA_CORRENTE' | 'POUPANCA' | 'CONTA_SALARIO' | 'CONTA_INVESTIMENTO'
  subtype: string
  name: string
  agency?: string
  number: string
  balance: number
  currency: string
}

export interface InvestmentAccount {
  id: string
  type: 'RENDA_FIXA' | 'RENDA_VARIAVEL' | 'FUNDO' | 'PREVIDENCIA' | 'TESOURO_DIRETO'
  name: string
  balance: number
  currency: string
}

export interface InvestmentHolding {
  id: string
  accountId: string
  ticker?: string
  name: string
  quantity: number
  unitPrice: number
  totalValue: number
  type: 'RENDA_FIXA' | 'RENDA_VARIAVEL' | 'FUNDO' | 'PREVIDENCIA' | 'TESOURO_DIRETO'
  isTaxExempt: boolean
}

export interface IncomeDocument {
  id: string
  connectionId: string
  bankName: string
  year: number
  type: 'INFORM_RENDIMENTOS' | 'EXTRATO_ANUAL'
  totalIncome: number
  taxableIncome: number
  exemptIncome: number
  taxWithheld: number
  receivedAt: string
  parsed: boolean
  rawData?: {
    employee?: string
    cnpj?: string
    incomeItems?: Array<{
      type: string
      description: string
      value: number
    }>
  }
}

export interface BankAPIResponse<T> {
  data: T
  meta?: {
    totalPages?: number
    totalRecords?: number
    requestDateTime?: string
  }
}

// Buscar contas do banco
export async function fetchAccounts(connection: BankConnection, accessToken: string): Promise<Account[]> {
  const response = await fetch(`${getApiUrl()}/api/open-banking/accounts`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-connection-id': connection.id,
    },
  })

  if (!response.ok) {
    throw new Error('Falha ao buscar contas')
  }

  const result: BankAPIResponse<Account[]> = await response.json()
  return result.data
}

// Buscar saldos das contas
export async function fetchAccountBalances(connection: BankConnection, accessToken: string, accountIds: string[]): Promise<Record<string, number>> {
  const response = await fetch(`${getApiUrl()}/api/open-banking/accounts/balances`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accountIds }),
  })

  if (!response.ok) {
    throw new Error('Falha ao buscar saldos')
  }

  const result = await response.json()
  return result.data
}

// Buscar investimentos
export async function fetchInvestments(connection: BankConnection, accessToken: string): Promise<InvestmentAccount[]> {
  const response = await fetch(`${getApiUrl()}/api/open-banking/investments`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-connection-id': connection.id,
    },
  })

  if (!response.ok) {
    throw new Error('Falha ao buscar investimentos')
  }

  const result: BankAPIResponse<InvestmentAccount[]> = await response.json()
  return result.data
}

// Buscar posição de investimentos (ativos)
export async function fetchInvestmentHoldings(connection: BankConnection, accessToken: string): Promise<InvestmentHolding[]> {
  const response = await fetch(`${getApiUrl()}/api/open-banking/investments/holdings`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-connection-id': connection.id,
    },
  })

  if (!response.ok) {
    throw new Error('Falha ao buscar posição de investimentos')
  }

  const result: BankAPIResponse<InvestmentHolding[]> = await response.json()
  return result.data
}

// Buscar documentos de rendimento disponíveis
export async function fetchIncomeDocuments(connection: BankConnection, accessToken: string): Promise<IncomeDocument[]> {
  const response = await fetch(`${getApiUrl()}/api/open-banking/documents/income`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-connection-id': connection.id,
    },
  })

  if (!response.ok) {
    throw new Error('Falha ao buscar documentos de rendimento')
  }

  const result: BankAPIResponse<IncomeDocument[]> = await response.json()
  return result.data
}

// Baixar documento de rendimento
export async function downloadIncomeDocument(connection: BankConnection, accessToken: string, documentId: string): Promise<Blob> {
  const response = await fetch(`${getApiUrl()}/api/open-banking/documents/income/${documentId}/download`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-connection-id': connection.id,
    },
  })

  if (!response.ok) {
    throw new Error('Falha ao baixar documento')
  }

  return response.blob()
}

// Sincronizar dados do banco
export async function syncBankData(connection: BankConnection, accessToken: string): Promise<{
  accounts: Account[]
  investments: InvestmentAccount[]
  holdings: InvestmentHolding[]
  documents: IncomeDocument[]
}> {
  const [accounts, investments, holdings, documents] = await Promise.all([
    fetchAccounts(connection, accessToken),
    fetchInvestments(connection, accessToken),
    fetchInvestmentHoldings(connection, accessToken),
    fetchIncomeDocuments(connection, accessToken),
  ])

  return { accounts, investments, holdings, documents }
}