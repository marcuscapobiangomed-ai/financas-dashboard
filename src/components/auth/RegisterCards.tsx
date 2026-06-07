import { CreditCard, Plus, Trash2 } from 'lucide-react'
import { CardInput } from '../../hooks/useRegister'

interface RegisterCardsProps {
  cards: CardInput[]
  addCard: () => void
  removeCard: (id: string) => void
  updateCard: (id: string, field: keyof CardInput, value: string | number) => void
}

export function RegisterCards({
  cards,
  addCard,
  removeCard,
  updateCard,
}: RegisterCardsProps) {
  const inputClass = "w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300 transition-all font-sans"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CreditCard className="text-indigo-500" size={18} />
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Seus Cartões de Crédito</label>
        </div>
        <button
          type="button"
          onClick={addCard}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded-md transition-all cursor-pointer"
        >
          <Plus size={14} /> NOVO
        </button>
      </div>

      <div className="space-y-3">
        {cards.map((card) => (
          <div key={card.id} className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm group">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Nome do Cartão</label>
                <input
                  type="text"
                  className={inputClass}
                  value={card.label}
                  onChange={(e) => updateCard(card.id, 'label', e.target.value)}
                  placeholder="Ex: Nubank, Inter..."
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Limite Mensal</label>
                <input
                  type="number"
                  step="10"
                  className={inputClass}
                  value={card.limit}
                  onChange={(e) => updateCard(card.id, 'limit', Number(e.target.value))}
                  placeholder="Ex: 2000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Dia Fechamento</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  className={inputClass}
                  value={card.closingDay}
                  onChange={(e) => updateCard(card.id, 'closingDay', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Dia Vencimento</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  className={inputClass}
                  value={card.dueDay}
                  onChange={(e) => updateCard(card.id, 'dueDay', Number(e.target.value))}
                />
              </div>
            </div>
            
            {cards.length > 1 && (
              <button
                type="button"
                onClick={() => removeCard(card.id)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg cursor-pointer"
                title="Remover cartão"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
