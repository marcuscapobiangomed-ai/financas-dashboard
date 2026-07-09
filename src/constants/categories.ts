import { Category } from '../types/category'
import { SectionType } from '../types/transaction'

export const SECTION_LABELS: Record<SectionType, string> = {
  entradas: 'Entradas',
  despesas_fixas: 'Despesas Fixas',
  gastos_diarios: 'Pix/Dinheiro',
  cartao_x: 'Cartão X',
  cartao_y: 'Cartão Y',
}

export const SECTION_ORDER: SectionType[] = [
  'entradas',
  'despesas_fixas',
  'gastos_diarios',
  'cartao_x',
  'cartao_y',
]

export const EXPENSE_SECTIONS: SectionType[] = [
  'despesas_fixas',
  'gastos_diarios',
  'cartao_x',
  'cartao_y',
]

export const SECTION_DEFAULT_ITEMS: Record<SectionType, string[]> = {
  entradas: ['Trabalho', 'Salário', 'Presente', 'Bônus', 'Rendimento', 'Extra', 'Outro'],
  despesas_fixas: ['Dízimo', 'Oferta', 'Água', 'Luz', 'Prestação da Casa', 'Conta de Celular', 'Internet Residencial', 'TV a Cabo', 'Mercado'],
  gastos_diarios: [],
  cartao_x: [],
  cartao_y: [],
}

export const SECTION_CATEGORIES: Record<SectionType, Category[]> = {
  entradas: [Category.TRABALHO, Category.RENDIMENTOS, Category.PRESENTES, Category.EXTRAS, Category.ENTRADAS, Category.OUTROS],
  despesas_fixas: [Category.DIZIMOS, Category.OFERTAS, Category.MORADIA, Category.ALIMENTACAO, Category.LAZER],
  gastos_diarios: [Category.ALIMENTACAO, Category.TRANSPORTE, Category.VESTUARIO, Category.CUIDADOS_PESSOAIS, Category.EDUCACAO, Category.SAUDE, Category.LAZER, Category.OUTROS],
  cartao_x: [Category.ALIMENTACAO, Category.TRANSPORTE, Category.VESTUARIO, Category.CUIDADOS_PESSOAIS, Category.EDUCACAO, Category.SAUDE, Category.LAZER, Category.OUTROS],
  cartao_y: [Category.ALIMENTACAO, Category.TRANSPORTE, Category.VESTUARIO, Category.CUIDADOS_PESSOAIS, Category.EDUCACAO, Category.SAUDE, Category.LAZER, Category.OUTROS],
}

// Colors for charts (same order as used in stacked bars)
export const CHART_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#6b7280',
]
