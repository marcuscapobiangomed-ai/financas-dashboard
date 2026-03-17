export type InvestmentType =
  | 'cdb'
  | 'lci'
  | 'lca'
  | 'tesouro_selic'
  | 'tesouro_ipca'
  | 'poupanca'
  | 'fundo'
  | 'manual'

export interface InvestmentTypeMeta {
  type: InvestmentType
  label: string
  isTaxExempt: boolean
  yieldInputMode: 'cdi_percent' | 'manual_monthly' | 'ipca_plus'
  description: string
}

export interface Investment {
  id: string
  name: string
  principal: number
  monthlyYieldPercent: number   // derived for CDI-based, manual for legacy
  startMonth: string            // "2026-01"
  isActive: boolean
  notes?: string

  // optional fields for CDI-based investments (nullable for backward compat)
  investmentType?: InvestmentType
  cdiPercent?: number            // e.g. 116 for "116% do CDI"
  ipcaPercent?: number           // e.g. 6.5 for "IPCA + 6.5%"
}
