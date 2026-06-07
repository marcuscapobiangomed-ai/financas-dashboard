import { ShieldCheck } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { FormState } from '../../hooks/useInvestments'
import { InvestmentType } from '../../types/investment'
import { INVESTMENT_TYPES, getInvestmentMeta } from '../../constants/investmentTypes'
import {
  computeProjection, effectiveAnnualRate, effectiveAnnualRateIPCA, poupancaAnnualRate,
} from '../../utils/investmentCalc'

interface InvestmentModalProps {
  open: boolean
  onClose: () => void
  editingId: string | null
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  cdiRate: number
  ipcaRate: number
  handleTypeChange: (type: InvestmentType) => void
  onSubmit: () => void
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function InvestmentModal({
  open, onClose, editingId, form, setForm, cdiRate, ipcaRate, handleTypeChange, onSubmit,
}: InvestmentModalProps) {
  const selectedMeta = getInvestmentMeta(form.investmentType)

  function getFormPreview() {
    let principal = parseFloat(form.principal) || 0
    if (selectedMeta.yieldInputMode === 'variable_income') {
      principal = (parseFloat(form.shares) || 0) * (parseFloat(form.averagePrice) || 0)
    }
    if (principal <= 0) return null

    let annualRate = 0
    if (selectedMeta.yieldInputMode === 'cdi_percent') {
      if (form.investmentType === 'poupanca') {
        annualRate = poupancaAnnualRate(cdiRate)
      } else {
        const cdiPct = parseFloat(form.cdiPercent) || 0
        if (cdiPct <= 0) return null
        annualRate = effectiveAnnualRate(cdiPct, cdiRate)
      }
    } else if (selectedMeta.yieldInputMode === 'ipca_plus') {
      const spread = parseFloat(form.ipcaPercent) || 0
      annualRate = effectiveAnnualRateIPCA(spread, ipcaRate)
    } else {
      const m = parseFloat(form.monthlyYieldPercent) || 0
      if (m <= 0 && selectedMeta.yieldInputMode !== 'variable_income') return null
      annualRate = m * 12
    }
    return computeProjection(principal, annualRate)
  }

  const preview = getFormPreview()
  const isSubmitDisabled =
    (selectedMeta.yieldInputMode !== 'variable_income' &&
      (!form.name.trim() || !form.principal || parseFloat(form.principal) <= 0)) ||
    (selectedMeta.yieldInputMode === 'variable_income' &&
      (!form.ticker || !form.shares || !form.averagePrice))

  return (
    <Modal open={open} onClose={onClose} title={editingId ? 'Editar investimento' : 'Novo investimento'}>
      <div className="flex flex-col gap-4">
        {/* Investment type selector */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Tipo de investimento</label>
          <select
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 bg-white dark:bg-gray-800 dark:text-gray-100"
            value={form.investmentType} onChange={(e) => handleTypeChange(e.target.value as InvestmentType)}
          >
            {INVESTMENT_TYPES.map((t) => (
              <option key={t.type} value={t.type}>{t.label} — {t.description}</option>
            ))}
          </select>
          {selectedMeta.isTaxExempt && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><ShieldCheck size={11} /> Isento de Imposto de Renda</p>
          )}
        </div>

        {selectedMeta.yieldInputMode === 'variable_income' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Ticker" value={form.ticker} onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))} placeholder="Ex: PETR4, IVVB11..." />
            </div>
            <Input label="Quantidade" type="number" value={form.shares} onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))} placeholder="Ex: 100" />
            <Input label="Preço Médio" type="number" prefix="R$" value={form.averagePrice} onChange={(e) => setForm((f) => ({ ...f, averagePrice: e.target.value }))} placeholder="Ex: 35.50" />
            {form.shares && form.averagePrice && (
               <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-white/5 text-[10px] font-bold text-gray-500 uppercase">
                  Total Investido: <span className="text-indigo-600 dark:text-indigo-400">{fmt((parseFloat(form.shares) || 0) * (parseFloat(form.averagePrice) || 0))}</span>
               </div>
            )}
          </div>
        ) : (
          <>
            <Input label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={`Ex: ${selectedMeta.label} Nubank, ${selectedMeta.label} Inter...`} />
            <Input label="Valor investido (R$)" type="number" prefix="R$" min="0" step="100" value={form.principal} onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))} />
          </>
        )}

        {/* Conditional yield fields */}
        {selectedMeta.yieldInputMode === 'cdi_percent' && form.investmentType !== 'poupanca' && (
          <div>
            <Input label="% do CDI" type="number" min="0" step="1" value={form.cdiPercent} onChange={(e) => setForm((f) => ({ ...f, cdiPercent: e.target.value }))} placeholder="Ex: 116" />
            {form.cdiPercent && (
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                {form.cdiPercent}% x CDI ({cdiRate.toFixed(2)}%) = {effectiveAnnualRate(parseFloat(form.cdiPercent) || 0, cdiRate).toFixed(2)}% a.a.
              </p>
            )}
          </div>
        )}

        {form.investmentType === 'poupanca' && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">Rendimento calculado automaticamente: 70% da Selic</p>
          </div>
        )}

        {selectedMeta.yieldInputMode === 'ipca_plus' && (
          <div>
            <Input label="% acima do IPCA (spread)" type="number" min="0" step="0.1" value={form.ipcaPercent} onChange={(e) => setForm((f) => ({ ...f, ipcaPercent: e.target.value }))} placeholder="Ex: 6.5" />
          </div>
        )}

        {(selectedMeta.yieldInputMode === 'manual_monthly' || selectedMeta.yieldInputMode === 'variable_income') && (
          <div>
            <Input
              label={selectedMeta.yieldInputMode === 'variable_income' ? "Dividendos mensais est. (%)" : "Rendimento mensal (%)"}
              type="number" min="0" step="0.01" value={form.monthlyYieldPercent} onChange={(e) => setForm((f) => ({ ...f, monthlyYieldPercent: e.target.value }))} placeholder="Ex: 0.80"
            />
          </div>
        )}

        {/* Live preview */}
        {preview && (
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3 py-2.5 border border-emerald-100 dark:border-emerald-800">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Rendimento estimado</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-emerald-600">
              <span>Mensal: <strong>{fmt(preview.monthlyAmount)}</strong></span>
              <span>Anual: <strong>{fmt(preview.annualAmount)}</strong></span>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Início do rastreamento</label>
          <input
            type="month" className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 dark:bg-gray-800 dark:text-gray-100"
            value={form.startMonth} onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))}
          />
        </div>

        <Input label="Observações (opcional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Ex: vence em dez/2026, resgate automático..." />

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={onSubmit} className="flex-1" disabled={isSubmitDisabled}>{editingId ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </div>
    </Modal>
  )
}
