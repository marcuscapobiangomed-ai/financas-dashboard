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
  monthSettings: {} as Record<string, any>,
  appSettings: {
    cardSections: [] as any[],
  },
}))

vi.mock('../../store/useFinanceStore', () => ({
  useFinanceStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}))

describe('TransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.appSettings.cardSections = []
    mockStore.monthSettings = {}
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

  describe('editing card transactions', () => {
    const initialTx = {
      id: 'tx-123',
      description: 'Lanche original',
      amount: 15,
      date: '2025-06-15',
      monthKey: '2025-07',
      section: 'cartao_teste',
      category: 'Alimentação',
      type: 'expense'
    }

    beforeEach(() => {
      mockStore.appSettings.cardSections = [
        { id: 'cartao_teste', label: 'Cartao Teste', closingDay: 30, dueDay: 10 },
        { id: 'cartao_outro', label: 'Outro Cartao', closingDay: 5, dueDay: 15 },
      ]
    })

    it('preserves billing month when editing description without changing date/section', () => {
      render(<TransactionForm initial={initialTx} defaultMonthKey="2025-06" />)

      fireEvent.change(screen.getByPlaceholderText('Ex: Mercado, Conta de Luz...'), {
        target: { value: 'Lanche novo' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(mockStore.updateTransaction).toHaveBeenCalledWith(
        'tx-123',
        expect.objectContaining({
          description: 'Lanche novo',
          monthKey: '2025-07',
        })
      )
    })

    it('recomputes billing month when editing date of card transaction', () => {
      render(<TransactionForm initial={initialTx} defaultMonthKey="2025-06" />)

      fireEvent.change(screen.getByDisplayValue('2025-06-15'), { target: { value: '2025-05-15' } })
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(mockStore.updateTransaction).toHaveBeenCalledWith(
        'tx-123',
        expect.objectContaining({
          date: '2025-05-15',
          monthKey: '2025-06',
        })
      )
    })

    it('recomputes billing month when changing section from card to normal section', () => {
      render(<TransactionForm initial={initialTx} defaultMonthKey="2025-06" />)

      fireEvent.click(screen.getByRole('button', { name: 'Despesas Fixas' }))
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(mockStore.updateTransaction).toHaveBeenCalledWith(
        'tx-123',
        expect.objectContaining({
          section: 'despesas_fixas',
          monthKey: '2025-06',
        })
      )
    })

    it('validates that target month is not closed when saving', () => {
      mockStore.monthSettings = {
        '2025-07': { isClosed: true }
      }

      render(<TransactionForm initial={initialTx} defaultMonthKey="2025-06" />)

      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(mockStore.updateTransaction).not.toHaveBeenCalled()
      expect(screen.getByText('O mês de faturamento ou lançamento está fechado. Reabra-o para alterar.')).toBeInTheDocument()
    })
  })
})
