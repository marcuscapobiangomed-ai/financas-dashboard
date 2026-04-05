import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { ExtraordinaryEntry } from '../../types/transaction'
import { computeExtraordinaryTotals } from '../../utils/calculations'
import { formatCurrency } from '../../utils/currency'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

interface Props {
  monthKey: string
  disabled?: boolean
}

const TYPES: { value: ExtraordinaryEntry['type']; label: string }[] = [
  { value: 'ferias', label: 'Férias' },
  { value: 'plr', label: 'PLR' },
  { value: 'decimo_terceiro', label: '13° Salário' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'outro', label: 'Outro' },
]

function AddEntryForm({ monthKey, onDone }: { monthKey: string; onDone: () => void }) {
  const addExtraordinary = useFinanceStore((s) => s.addExtraordinary)
  const getMonthSettings = useFinanceStore((s) => s.getMonthSettings)
  const settings = getMonthSettings(monthKey)

  const [type, setType] = useState<ExtraordinaryEntry['type']>('ferias')
  const [gross, setGross] = useState('')
  const [tithePercent, setTithePercent] = useState(String(settings.tithePercent))
  const [offeringPercent, setOfferingPercent] = useState(String(settings.offeringPercent))
  const [desc, setDesc] = useState('')

  const grossNum = parseFloat(gross.replace(',', '.')) || 0
  const tithePct = parseFloat(tithePercent) || 0
  const offeringPct = parseFloat(offeringPercent) || 0
  const computed = computeExtraordinaryTotals({ grossAmount: grossNum, tithePercent: tithePct, offeringPercent: offeringPct })

  function save() {
    if (grossNum <= 0) return
    addExtraordinary({
      type,
      grossAmount: grossNum,
      tithePercent: tithePct,
      offeringPercent: offeringPct,
      tithe: computed.tithe,
      offering: computed.offering,
      netAmount: computed.netAmount,
      monthKey,
      description: desc || undefined,
    })
    onDone()
  }

  return (
    <div className="bg-indigo-50/80 dark:bg-indigo-900/30 rounded-xl p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value as ExtraordinaryEntry['type'])}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Input
          label="Valor Bruto"
          prefix="R$"
          type="number"
          step="0.01"
          min="0.01"
          value={gross}
          onChange={(e) => setGross(e.target.value)}
          placeholder="0,00"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Dízimo %"
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={tithePercent}
          onChange={(e) => setTithePercent(e.target.value)}
        />
        <Input
          label="Oferta %"
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={offeringPercent}
          onChange={(e) => setOfferingPercent(e.target.value)}
        />
      </div>
      <Input
        label="Descrição (opcional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Férias de julho..."
      />
      {grossNum > 0 && (
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-lg p-2">
          <div>Dízimo: <strong className="text-gray-800 dark:text-gray-200">{formatCurrency(computed.tithe)}</strong></div>
          <div>Oferta: <strong className="text-gray-800 dark:text-gray-200">{formatCurrency(computed.offering)}</strong></div>
          <div>Líquido: <strong className="text-emerald-700 dark:text-emerald-400">{formatCurrency(computed.netAmount)}</strong></div>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onDone}>Cancelar</Button>
        <Button variant="primary" size="sm" onClick={save} disabled={grossNum <= 0}>Salvar</Button>
      </div>
    </div>
  )
}

export function ExtraordinarySection({ monthKey, disabled }: Props) {
  const allEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const entries = allEntries.filter((e) => e.monthKey === monthKey)
  const deleteExtraordinary = useFinanceStore((s) => s.deleteExtraordinary)
  const [adding, setAdding] = useState(false)

  const totalNet = entries.reduce((s, e) => s + e.netAmount, 0)

  return (
    <div className="glass-panel-lg glass-panel-hover-success overflow-hidden group">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/50 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <span className="text-lg">💰</span>
          </div>
          <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Renda Extraordinária</span>
        </div>
        <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalNet)}</span>
      </div>

      <div className="divide-y divide-gray-50/50 dark:divide-gray-700/50">
        {entries.map((e) => {
          const typeLabel = TYPES.find((t) => t.value === e.type)?.label ?? e.type
          return (
            <div key={e.id} className="px-5 py-3.5 flex items-center justify-between group-hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20 transition-colors">
              <div className="flex flex-col">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{typeLabel}{e.description ? ` — ${e.description}` : ''}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Bruto: {formatCurrency(e.grossAmount)} · Dízimo: {formatCurrency(e.tithe)} · Oferta: {formatCurrency(e.offering)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-emerald-600">{formatCurrency(e.netAmount)}</span>
                {!disabled && (
                  <button
                    onClick={() => deleteExtraordinary(e.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 cursor-pointer transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {entries.length === 0 && !adding && (
        <p className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500 italic text-center">Nenhuma renda extraordinária este mês.</p>
      )}

      {adding && <div className="p-4 border-t border-gray-100/50 dark:border-gray-700/50"><AddEntryForm monthKey={monthKey} onDone={() => setAdding(false)} /></div>}

      {!disabled && !adding && (
        <div className="px-5 py-3.5 border-t border-gray-100/50 dark:border-gray-700/50 bg-white/20 dark:bg-gray-800/20">
          <button
            onClick={() => setAdding(true)}
            className="pill-button-success"
          >
            <Plus size={14} />
            Adicionar renda extra
          </button>
        </div>
      )}
    </div>
  )
}