import type { InvestmentTypeMeta } from '../types/investment'

export const INVESTMENT_TYPES: InvestmentTypeMeta[] = [
  {
    type: 'cdb',
    label: 'CDB',
    isTaxExempt: false,
    yieldInputMode: 'cdi_percent',
    description: 'Certificado de Depósito Bancário',
  },
  {
    type: 'lci',
    label: 'LCI',
    isTaxExempt: true,
    yieldInputMode: 'cdi_percent',
    description: 'Letra de Crédito Imobiliário (isenta de IR)',
  },
  {
    type: 'lca',
    label: 'LCA',
    isTaxExempt: true,
    yieldInputMode: 'cdi_percent',
    description: 'Letra de Crédito do Agronegócio (isenta de IR)',
  },
  {
    type: 'tesouro_selic',
    label: 'Tesouro Selic',
    isTaxExempt: false,
    yieldInputMode: 'cdi_percent',
    description: 'Tesouro Direto atrelado à Selic',
  },
  {
    type: 'tesouro_ipca',
    label: 'Tesouro IPCA+',
    isTaxExempt: false,
    yieldInputMode: 'ipca_plus',
    description: 'Tesouro Direto IPCA + taxa fixa',
  },
  {
    type: 'poupanca',
    label: 'Poupança',
    isTaxExempt: true,
    yieldInputMode: 'cdi_percent',
    description: 'Caderneta de Poupança (isenta de IR)',
  },
  {
    type: 'fundo',
    label: 'Fundo DI',
    isTaxExempt: false,
    yieldInputMode: 'cdi_percent',
    description: 'Fundo de Investimento DI / Renda Fixa',
  },
  {
    type: 'manual',
    label: 'Outro (manual)',
    isTaxExempt: false,
    yieldInputMode: 'manual_monthly',
    description: 'Definir rendimento mensal manualmente',
  },
]

export function getInvestmentMeta(type?: string): InvestmentTypeMeta {
  return INVESTMENT_TYPES.find((t) => t.type === type) ?? INVESTMENT_TYPES[INVESTMENT_TYPES.length - 1]
}
