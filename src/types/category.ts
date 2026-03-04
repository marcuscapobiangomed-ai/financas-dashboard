export enum Category {
  ENTRADAS = 'ENTRADAS',
  DIZIMOS = 'DIZIMOS',
  OFERTAS = 'OFERTAS',
  MORADIA = 'MORADIA',
  ALIMENTACAO = 'ALIMENTACAO',
  TRANSPORTE = 'TRANSPORTE',
  VESTUARIO = 'VESTUARIO',
  CUIDADOS_PESSOAIS = 'CUIDADOS_PESSOAIS',
  EDUCACAO = 'EDUCACAO',
  SAUDE = 'SAUDE',
  LAZER = 'LAZER',
  POUPANCA = 'POUPANCA',
  INVESTIMENTOS = 'INVESTIMENTOS',
  BENS_ADQUIRIDOS = 'BENS_ADQUIRIDOS',
  OUTROS = 'OUTROS',
}

export interface CategoryMeta {
  label: string
  color: string
  bgColor: string
  icon: string
  isIncome: boolean
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  [Category.ENTRADAS]: { label: 'Entradas', color: '#10b981', bgColor: '#d1fae5', icon: 'TrendingUp', isIncome: true },
  [Category.DIZIMOS]: { label: 'Dízimos', color: '#8b5cf6', bgColor: '#ede9fe', icon: 'Heart', isIncome: false },
  [Category.OFERTAS]: { label: 'Ofertas', color: '#a78bfa', bgColor: '#f5f3ff', icon: 'Gift', isIncome: false },
  [Category.MORADIA]: { label: 'Moradia', color: '#f59e0b', bgColor: '#fef3c7', icon: 'Home', isIncome: false },
  [Category.ALIMENTACAO]: { label: 'Alimentação', color: '#ef4444', bgColor: '#fee2e2', icon: 'ShoppingCart', isIncome: false },
  [Category.TRANSPORTE]: { label: 'Transporte', color: '#3b82f6', bgColor: '#dbeafe', icon: 'Car', isIncome: false },
  [Category.VESTUARIO]: { label: 'Vestuário', color: '#ec4899', bgColor: '#fce7f3', icon: 'Shirt', isIncome: false },
  [Category.CUIDADOS_PESSOAIS]: { label: 'Cuidados Pessoais', color: '#14b8a6', bgColor: '#ccfbf1', icon: 'Sparkles', isIncome: false },
  [Category.EDUCACAO]: { label: 'Educação', color: '#6366f1', bgColor: '#e0e7ff', icon: 'BookOpen', isIncome: false },
  [Category.SAUDE]: { label: 'Saúde', color: '#f43f5e', bgColor: '#ffe4e6', icon: 'Activity', isIncome: false },
  [Category.LAZER]: { label: 'Lazer', color: '#f97316', bgColor: '#ffedd5', icon: 'Tv', isIncome: false },
  [Category.POUPANCA]: { label: 'Poupança', color: '#22c55e', bgColor: '#dcfce7', icon: 'PiggyBank', isIncome: false },
  [Category.INVESTIMENTOS]: { label: 'Investimentos', color: '#0ea5e9', bgColor: '#e0f2fe', icon: 'BarChart2', isIncome: false },
  [Category.BENS_ADQUIRIDOS]: { label: 'Bens Adquiridos', color: '#84cc16', bgColor: '#f7fee7', icon: 'Package', isIncome: false },
  [Category.OUTROS]: { label: 'Outros', color: '#6b7280', bgColor: '#f3f4f6', icon: 'MoreHorizontal', isIncome: false },
}
