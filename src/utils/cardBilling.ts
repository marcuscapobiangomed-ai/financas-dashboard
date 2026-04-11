/**
 * Utilitários para cálculo de ciclo de faturamento de cartão de crédito.
 *
 * Regra principal:
 * - Se a data da compra é APÓS o dia de fechamento → cai na fatura do mês seguinte
 * - Se a data da compra é ANTES ou NO dia de fechamento → cai na fatura do mês atual
 */

/**
 * Dado a data da compra e o dia de fechamento do cartão,
 * retorna o monthKey do mês em que a fatura será paga (mês do vencimento).
 *
 * @param purchaseDate Data da compra no formato "YYYY-MM-DD"
 * @param closingDay Dia do fechamento da fatura (1-28)
 * @returns monthKey no formato "YYYY-MM"
 *
 * @example
 * getBillingMonthKey("2025-04-15", 10) // "2025-05" (compra após fechamento)
 * getBillingMonthKey("2025-04-05", 10) // "2025-04" (compra antes do fechamento)
 * getBillingMonthKey("2025-12-25", 10) // "2026-01" (transição de ano)
 */
export function getBillingMonthKey(purchaseDate: string, closingDay: number): string {
  const [year, month, day] = purchaseDate.split('-').map(Number)

  if (day > closingDay) {
    // Compra após fechamento → fatura do mês seguinte
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  }

  // Compra antes ou no dia do fechamento → fatura deste mês
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Retorna a data de vencimento da fatura para um dado monthKey.
 *
 * @param monthKey Mês da fatura no formato "YYYY-MM"
 * @param dueDay Dia do vencimento (1-28)
 * @returns Data de vencimento no formato "YYYY-MM-DD"
 */
export function getDueDate(monthKey: string, dueDay: number): string {
  return `${monthKey}-${String(dueDay).padStart(2, '0')}`
}

/**
 * Formata o mês de faturamento para exibição.
 *
 * @param monthKey Mês no formato "YYYY-MM"
 * @returns String legível como "Mai/2025"
 */
export function formatBillingMonth(monthKey: string): string {
  const MONTH_LABELS = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ]
  const [year, month] = monthKey.split('-').map(Number)
  return `${MONTH_LABELS[month - 1]}/${year}`
}
