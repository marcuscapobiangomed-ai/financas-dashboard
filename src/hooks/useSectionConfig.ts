import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Category } from '../types/category'
import { DEFAULT_CARD_SECTIONS } from '../constants/defaultBudget'

const CARD_CATEGORIES: Category[] = [
  Category.ALIMENTACAO,
  Category.TRANSPORTE,
  Category.VESTUARIO,
  Category.CUIDADOS_PESSOAIS,
  Category.EDUCACAO,
  Category.SAUDE,
  Category.LAZER,
  Category.OUTROS,
]

export function useSectionConfig() {
  const rawCards = useFinanceStore((s) => s.appSettings.cardSections)

  return useMemo(() => {
    // Fallback for users who had the app before cardSections was added
    const cards = rawCards ?? DEFAULT_CARD_SECTIONS

    const sectionLabels: Record<string, string> = {
      entradas: 'Entradas',
      despesas_fixas: 'Despesas Fixas',
      gastos_diarios: 'Gastos do Dia a Dia',
      extraordinario: 'Férias / PLR / 13°',
    }
    cards.forEach((c) => { sectionLabels[c.id] = c.label })

    const cardIds = cards.map((c) => c.id)
    const sectionOrder = ['entradas', 'despesas_fixas', 'gastos_diarios', ...cardIds, 'extraordinario']
    const expenseSections = ['despesas_fixas', 'gastos_diarios', ...cardIds]

    const sectionCategories: Record<string, Category[]> = {
      entradas: [Category.ENTRADAS],
      despesas_fixas: [
        Category.DIZIMOS,
        Category.OFERTAS,
        Category.MORADIA,
        Category.ALIMENTACAO,
        Category.LAZER,
      ],
      gastos_diarios: CARD_CATEGORIES,
      extraordinario: [Category.ENTRADAS],
    }
    cardIds.forEach((id) => { sectionCategories[id] = CARD_CATEGORIES })

    return { sectionLabels, sectionOrder, expenseSections, cardSections: cards, sectionCategories }
  }, [rawCards])
}
