import { Settings2, RefreshCw } from 'lucide-react'

interface RatesBannerProps {
  cdiRate: number
  ipcaRate: number
  selicDisplay: number | null
  editingRates: boolean
  tempCdi: string
  tempIpca: string
  ratesFetching: boolean
  rateMsg: string
  setTempCdi: (v: string) => void
  setTempIpca: (v: string) => void
  setEditingRates: (b: boolean) => void
  saveRates: () => void
  openEditRates: () => void
  handleRefreshRates: () => void
}

export function RatesBanner({
  cdiRate,
  ipcaRate,
  selicDisplay,
  editingRates,
  tempCdi,
  tempIpca,
  ratesFetching,
  rateMsg,
  setTempCdi,
  setTempIpca,
  setEditingRates,
  saveRates,
  openEditRates,
  handleRefreshRates,
}: RatesBannerProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 px-4 py-2.5">
        <Settings2 size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
        {editingRates ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <label className="text-xs text-indigo-700 dark:text-indigo-300">CDI:</label>
            <input
              type="number"
              step="0.01"
              className="w-20 border border-indigo-200 dark:border-indigo-700 rounded px-2 py-0.5 text-xs dark:bg-gray-800 dark:text-gray-100"
              value={tempCdi}
              onChange={(e) => setTempCdi(e.target.value)}
            />
            <span className="text-xs text-indigo-500 dark:text-indigo-400">% a.a.</span>
            <span className="text-indigo-300 dark:text-indigo-600 mx-1">|</span>
            <label className="text-xs text-indigo-700 dark:text-indigo-300">IPCA:</label>
            <input
              type="number"
              step="0.01"
              className="w-20 border border-indigo-200 dark:border-indigo-700 rounded px-2 py-0.5 text-xs dark:bg-gray-800 dark:text-gray-100"
              value={tempIpca}
              onChange={(e) => setTempIpca(e.target.value)}
            />
            <span className="text-xs text-indigo-500 dark:text-indigo-400">% a.a.</span>
            <button onClick={saveRates} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-2 cursor-pointer">Salvar</button>
            <button onClick={() => setEditingRates(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:underline cursor-pointer">Cancelar</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1 flex-wrap">
            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">CDI: {cdiRate.toFixed(2)}%</span>
            <span className="text-indigo-300 dark:text-indigo-600 mx-1">|</span>
            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">IPCA: {ipcaRate.toFixed(2)}%</span>
            {selicDisplay && (
              <>
                <span className="text-indigo-300 dark:text-indigo-600 mx-1">|</span>
                <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Selic: {selicDisplay.toFixed(2)}%</span>
              </>
            )}
            <button onClick={openEditRates} className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 ml-2 cursor-pointer">Editar</button>
            <button
              onClick={handleRefreshRates}
              disabled={ratesFetching}
              className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 ml-1 cursor-pointer disabled:opacity-50"
              title="Atualizar taxas via Banco Central"
            >
              <RefreshCw size={12} className={ratesFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {rateMsg && (
        <p className={`text-xs px-4 py-2 rounded-lg ${rateMsg.includes('Erro') ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'}`}>{rateMsg}</p>
      )}
    </div>
  )
}
