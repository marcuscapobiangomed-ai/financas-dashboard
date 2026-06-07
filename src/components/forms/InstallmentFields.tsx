import { Input } from '../ui/Input'

interface InstallmentFieldsProps {
  isInstallment: boolean
  setIsInstallment: (v: boolean) => void
  installmentCount: string
  setInstallmentCount: (v: string) => void
  amount: string
  error?: string
}

export function InstallmentFields({
  isInstallment,
  setIsInstallment,
  installmentCount,
  setInstallmentCount,
  amount,
  error,
}: InstallmentFieldsProps) {
  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isInstallment}
          onChange={(e) => setIsInstallment(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Parcelado</span>
      </label>
      {isInstallment && (
        <div className="flex items-center gap-3">
          <Input
            label="Parcelas"
            type="number"
            min="2"
            max="360"
            value={installmentCount}
            onChange={(e) => setInstallmentCount(e.target.value)}
            error={error}
          />
          {installmentCount && parsedAmount > 0 && (
            <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg mt-5 whitespace-nowrap">
              {parseInt(installmentCount)}x de R$ {(parsedAmount).toFixed(2)}
              {' = Total R$ '}
              {(parsedAmount * parseInt(installmentCount || '0')).toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
