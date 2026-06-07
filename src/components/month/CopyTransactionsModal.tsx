import { CheckSquare, Square, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../utils/currency'
import { getMonthLabel } from '../../constants/months'
import { useCopyTransactions } from '../../hooks/useCopyTransactions'

interface Props {
  open: boolean
  onClose: () => void
  monthKey: string
}

export function CopyTransactionsModal({ open, onClose, monthKey }: Props) {
  const {
    sourceMonth,
    selected,
    setSelected,
    expandedSections,
    done,
    availableMonths,
    sourceTransactions,
    existingSet,
    transactionsBySection,
    alreadyCopied,
    handleSelectSourceMonth,
    toggleSection,
    toggleOne,
    toggleAllInSection,
    handleCopy,
    handleClose,
    copiedFromMonths,
    sectionLabels,
  } = useCopyTransactions({ onClose, monthKey })

  return (
    <Modal open={open} onClose={handleClose} title="Copiar transações" size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={sourceMonth}
            onChange={(e) => handleSelectSourceMonth(e.target.value)}
            className="flex-1"
          >
            <option value="">Selecione o mês de origem</option>
            {availableMonths.map((m) => {
              const isCopied = copiedFromMonths.includes(m)
              return (
                <option key={m} value={m}>
                  {getMonthLabel(m)}{isCopied ? ' (já copiado)' : ''}
                </option>
              )
            })}
          </Select>
        </div>

        {sourceMonth && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {sourceTransactions.length} transações encontradas
                {' · '}
                {sourceTransactions.filter((t) => !alreadyCopied(t)).length} disponíveis para copiar
                {existingSet.size > 0 && ` · ${existingSet.size} já existem no mês atual`}
              </span>
              <button
                onClick={() => {
                  const all = sourceTransactions.filter((t) => !alreadyCopied(t))
                  if (selected.size === all.length) {
                    setSelected(new Set())
                  } else {
                    setSelected(new Set(all.map((t) => t.id)))
                  }
                }}
                className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {selected.size === sourceTransactions.filter((t) => !alreadyCopied(t)).length
                  ? 'Desmarcar todos'
                  : 'Selecionar todos disponíveis'}
              </button>
            </div>

            <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              {Object.entries(transactionsBySection).map(([section, txs]) => {
                const notCopied = txs.filter((t) => !alreadyCopied(t))
                const hasNotCopied = notCopied.length > 0
                
                return (
                  <div key={section} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <button
                      onClick={() => toggleSection(section)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {hasNotCopied ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleAllInSection(section) }}
                            className="p-0.5"
                          >
                            {notCopied.every((t) => selected.has(t.id)) ? (
                              <CheckSquare size={14} className="text-indigo-600" />
                            ) : (
                              <Square size={14} className="text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <div className="w-5" />
                        )}
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {sectionLabels[section] ?? section}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {hasNotCopied ? `${notCopied.length} disponíveis` : `${txs.length} já copiadas`}
                        </span>
                        {expandedSections.has(section) ? (
                          <ChevronUp size={14} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </button>
                    
                    {expandedSections.has(section) && (
                      <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {txs.map((t) => {
                          const copied = alreadyCopied(t)
                          const isChecked = selected.has(t.id)
                          
                          return (
                            <button
                              key={t.id}
                              onClick={() => !copied && toggleOne(t.id)}
                              disabled={copied}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                copied
                                  ? 'opacity-50 cursor-not-allowed bg-gray-50/30 dark:bg-gray-800/30'
                                  : isChecked
                                  ? 'bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {copied ? (
                                <div className="w-5 h-5 flex items-center justify-center text-green-600">
                                  <CheckSquare size={15} />
                                </div>
                              ) : isChecked ? (
                                <CheckSquare size={15} className="text-indigo-600 shrink-0" />
                              ) : (
                                <Square size={15} className="text-gray-300 dark:text-gray-600 shrink-0" />
                              )}
                              <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
                                {t.description}
                              </span>
                              <span className="text-sm font-medium shrink-0 w-24 text-right">
                                {formatCurrency(t.amount)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500">
                {selected.size} item(s) selecionado(s)
              </span>
              <Button onClick={handleCopy} disabled={selected.size === 0}>
                {done ? 'Copiado!' : `Copiar ${selected.size} transação(ões)`}
              </Button>
            </div>
          </>
        )}

        {!sourceMonth && (
          <div className="text-center py-8 text-gray-400">
            <Copy size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Selecione um mês para ver as transações disponíveis</p>
          </div>
        )}
      </div>
    </Modal>
  )
}