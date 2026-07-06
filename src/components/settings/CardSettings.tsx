import { CreditCard, Plus, CalendarDays, Pencil, Check, Trash2 } from 'lucide-react'
import { Input } from '../ui/Input'
import { CardSection, AppSettings } from '../../types/budget'

interface CardSettingsProps {
  cardSections: CardSection[]
  appSettings: AppSettings
  editingCardId: string | null
  editingLabel: string
  setEditingLabel: (v: string) => void
  setEditingCardId: (id: string | null) => void
  startEditCard: (card: CardSection) => void
  saveCardLabel: (id: string) => void
  handleAddCard: () => void
  handleCardLimitChange: (id: string, value: string) => void
  handleCardBillingChange: (id: string, field: 'closingDay' | 'dueDay', value: string) => void
  handleCardBillingBlur: (id: string, field: 'closingDay' | 'dueDay') => void
  handleRemoveCard: (id: string) => void
}

export function CardSettings({
  cardSections,
  appSettings,
  editingCardId,
  editingLabel,
  setEditingLabel,
  setEditingCardId,
  startEditCard,
  saveCardLabel,
  handleAddCard,
  handleCardLimitChange,
  handleCardBillingChange,
  handleCardBillingBlur,
  handleRemoveCard,
}: CardSettingsProps) {
  return (
    <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20">
            <CreditCard size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Cartões de Crédito</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie seus cartões</p>
          </div>
        </div>
        <button
          onClick={handleAddCard}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={14} />
          Adicionar cartão
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cardSections.map((card) => (
          <div key={card.id} className="group relative p-4 bg-white/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl hover:border-indigo-500/50 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">Nome</label>
                {editingCardId === card.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      className="flex-1 border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveCardLabel(card.id)
                        if (e.key === 'Escape') setEditingCardId(null)
                      }}
                    />
                    <button
                      onClick={() => saveCardLabel(card.id)}
                      className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{card.label}</span>
                    <button
                      onClick={() => startEditCard(card)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Input
                label="Limite"
                type="number"
                prefix="R$"
                step="50"
                min="0"
                value={String(appSettings.defaultSectionLimits[card.id] ?? 500)}
                onChange={(e) => handleCardLimitChange(card.id, e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1.5">
                  <CalendarDays size={10} />
                  Fechamento
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={card.closingDay === ('' as any) ? '' : (card.closingDay ?? 10)}
                  onChange={(e) => handleCardBillingChange(card.id, 'closingDay', e.target.value)}
                  onBlur={() => handleCardBillingBlur(card.id, 'closingDay')}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1.5">
                  <CalendarDays size={10} />
                  Vencimento
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={card.dueDay === ('' as any) ? '' : (card.dueDay ?? 20)}
                  onChange={(e) => handleCardBillingChange(card.id, 'dueDay', e.target.value)}
                  onBlur={() => handleCardBillingBlur(card.id, 'dueDay')}
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
              Compras no ou após o fechamento entram na próxima fatura. Se o vencimento for antes do fechamento, ela vence no mês seguinte.
            </p>
            {cardSections.length > 1 && (
              <button
                onClick={() => handleRemoveCard(card.id)}
                className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                title="Remover cartão"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
