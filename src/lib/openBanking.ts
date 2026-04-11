export interface Bank {
  id: string
  name: string
  logo: string
  authEndpoint: string
  scopes: string[]
  isOpenBanking: boolean
}

export interface BankConnection {
  id: string
  bankId: string
  bankName: string
  logo: string
  connectedAt: string
  lastSync: string | null
  status: 'connected' | 'disconnected' | 'error'
  errorMessage?: string
}

export interface BankDocument {
  id: string
  connectionId: string
  type: 'IRPF' | 'EXTRATO' | 'CONSIGNADO' | 'FUNDOS' | 'PREVIDENCIA'
  year: number
  availableAt: string
  downloadedAt?: string
}

export interface OpenBankingAuth {
  authorizationCode?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
}

// Bancos disponíveis no Brasil com Open Banking
// Status: Aguardando implementação do backend e registro no Banco Central
export const AVAILABLE_BANKS: Bank[] = [
  { id: 'itau', name: 'Itaú', logo: '🏦', authEndpoint: 'https://auth.itau.com.br', scopes: ['accounts', 'investments', 'credits', 'invoices-financings'], isOpenBanking: false },
  { id: 'bradesco', name: 'Bradesco', logo: '🏦', authEndpoint: 'https://auth.bradesco.com.br', scopes: ['accounts', 'investments', 'credits'], isOpenBanking: false },
  { id: 'santander', name: 'Santander', logo: '🏦', authEndpoint: 'https://auth.santander.com.br', scopes: ['accounts', 'investments', 'credits'], isOpenBanking: false },
  { id: 'bb', name: 'Banco do Brasil', logo: '🏦', authEndpoint: 'https://auth.bb.com.br', scopes: ['accounts', 'investments', 'credits', 'consignado'], isOpenBanking: false },
  { id: 'caixa', name: 'Caixa Econômica', logo: '🏦', authEndpoint: 'https://auth.caixa.gov.br', scopes: ['accounts', 'investments', 'credits'], isOpenBanking: false },
  { id: 'nubank', name: 'Nubank', logo: '💳', authEndpoint: 'https://auth.nubank.com.br', scopes: ['accounts', 'investments', 'credits'], isOpenBanking: false },
  { id: 'inter', name: 'Banco Inter', logo: '🏦', authEndpoint: 'https://auth.bancointer.com.br', scopes: ['accounts', 'investments', 'credits'], isOpenBanking: false },
  { id: 'xp', name: 'XP Investimentos', logo: '📈', authEndpoint: 'https://auth.xp.com.br', scopes: ['investments'], isOpenBanking: false },
  { id: 'modal', name: 'Modal', logo: '🏦', authEndpoint: 'https://auth.mmodal.com.br', scopes: ['accounts', 'investments'], isOpenBanking: false },
  { id: 'safra', name: 'Safra', logo: '🏦', authEndpoint: 'https://auth.safra.com.br', scopes: ['accounts', 'investments'], isOpenBanking: false },
]

// Scopes do Open Banking Brasil
export const OPEN_BANKING_SCOPES = {
  ACCOUNTS_READ: 'accounts.read',
  ACCOUNTS_BALANCES_READ: 'accounts.balances.read',
  ACCOUNTS_TRANSACTIONS_READ: 'accounts.transactions.read',
  INVESTMENTS_READ: 'investments.read',
  INVESTMENTS_ACCOUNTS_READ: 'investments.accounts.read',
  INVESTMENTS_TRANSACTIONS_READ: 'investments.transactions.read',
  CREDITS_READ: 'credits.read',
  CREDITS_CONTRACTS_READ: 'credits.contracts.read',
  CREDITS_INVOICES_FINANCINGS_READ: 'invoices-financings.read',
  CONSIGNED_INSURANCES_READ: 'consignado.read',
}

export function getBankById(id: string): Bank | undefined {
  return AVAILABLE_BANKS.find(b => b.id === id)
}