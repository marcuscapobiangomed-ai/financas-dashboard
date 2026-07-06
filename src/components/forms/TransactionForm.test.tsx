import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionForm } from './TransactionForm'

const mockStore = vi.hoisted(() => ({
  addTransaction: vi.fn(),
  addInstallmentTransactions: vi.fn(),
  addRecurringTemplate: vi.fn(() => 'recurring-1'),
  updateTransaction: vi.fn(),
  getDescriptionSuggestions: vi.fn(() => []),
  currentMonthKey: '2026-07',
  appSettings: {
    cardSections: [],
  },
}))

vi.mock('../../store/useFinanceStore', () => ({
  useFinanceStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}))

describe('TransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.appSettings.cardSections = []
  })

  it('accepts Brazilian decimal comma values for transaction amounts', () => {
    render(<TransactionForm />)

    const amountInput = screen.getByPlaceholderText('0,00')
    expect(amountInput).toHaveAttribute('type', 'text')
    expect(amountInput).toHaveAttribute('inputmode', 'decimal')

    fireEvent.change(amountInput, { target: { value: '123,45' } })
    fireEvent.change(screen.getByPlaceholderText('Ex: Mercado, Conta de Luz...'), {
      target: { value: 'Mercado' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(mockStore.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Mercado',
        amount: 123.45,
        monthKey: '2026-07',
        type: 'expense',
      })
    )
  })

  it('assigns card purchases to the invoice due month', () => {
    mockStore.appSettings.cardSections = [
      { id: 'cartao_teste', label: 'Cartao Teste', closingDay: 30, dueDay: 10 },
    ]

    render(<TransactionForm defaultMonthKey="2025-06" />)

    fireEvent.click(screen.getByRole('button', { name: 'Cartao Teste' }))
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '200' } })
    fireEvent.change(screen.getByPlaceholderText('Ex: Mercado, Conta de Luz...'), {
      target: { value: 'Mercado' },
    })
    fireEvent.change(screen.getByDisplayValue('2025-06-01'), { target: { value: '2025-06-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(mockStore.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Mercado',
        amount: 200,
        monthKey: '2025-07',
        section: 'cartao_teste',
      })
    )
  })
})
