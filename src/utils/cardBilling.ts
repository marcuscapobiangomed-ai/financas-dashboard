/**
 * Utilitarios para calculo de ciclo de faturamento de cartao de credito.
 *
 * Regra principal:
 * - Se a compra e no ou apos o dia de fechamento, ela entra na proxima fatura.
 * - Se o vencimento e antes ou no mesmo dia do fechamento, a fatura fechada em
 *   um mes sera paga no mes seguinte.
 */

function addMonthsToMonthKey(year: number, month: number, monthsToAdd: number): string {
  const totalMonths = year * 12 + (month - 1) + monthsToAdd
  const billingYear = Math.floor(totalMonths / 12)
  const billingMonth = (totalMonths % 12) + 1
  return `${billingYear}-${String(billingMonth).padStart(2, '0')}`
}

/**
 * Dada a data da compra, o fechamento e o vencimento do cartao, retorna o
 * monthKey do mes em que a fatura sera paga.
 *
 * Quando dueDay nao e informado, preserva a regra antiga: antes do fechamento
 * fica no mes da compra; no/após fechamento vai para o mes seguinte.
 *
 * @example
 * getBillingMonthKey("2025-06-15", 30, 10) // "2025-07"
 * getBillingMonthKey("2025-06-30", 30, 10) // "2025-08"
 * getBillingMonthKey("2025-04-05", 10, 20) // "2025-04"
 */
export function getBillingMonthKey(purchaseDate: string, closingDay: number, dueDay?: number): string {
  const [year, month, day] = purchaseDate.split('-').map(Number)

  let monthsToAdd = day >= closingDay ? 1 : 0

  if (dueDay != null && dueDay <= closingDay) {
    monthsToAdd += 1
  }

  return addMonthsToMonthKey(year, month, monthsToAdd)
}

/**
 * Retorna a data de vencimento da fatura para um dado monthKey.
 *
 * @param monthKey Mes da fatura no formato "YYYY-MM"
 * @param dueDay Dia do vencimento (1-28)
 * @returns Data de vencimento no formato "YYYY-MM-DD"
 */
export function getDueDate(monthKey: string, dueDay: number): string {
  return `${monthKey}-${String(dueDay).padStart(2, '0')}`
}

/**
 * Formata o mes de faturamento para exibicao.
 *
 * @param monthKey Mes no formato "YYYY-MM"
 * @returns String legivel como "Mai/2025"
 */
export function formatBillingMonth(monthKey: string): string {
  const MONTH_LABELS = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ]
  const [year, month] = monthKey.split('-').map(Number)
  return `${MONTH_LABELS[month - 1]}/${year}`
}
