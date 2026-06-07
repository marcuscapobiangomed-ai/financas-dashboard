import { ArrowRightLeft, Database, Download, Upload, Replace, Merge, Trash2, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import { Button } from '../ui/Button'

interface DataSettingsProps {
  migrateFrom: string; setMigrateFrom: (v: string) => void
  migrateTo: string; setMigrateTo: (v: string) => void
  migrateMsg: string; handleMigrate: () => void
  handleExportJSON: () => void; handleExportCSV: () => void; handleExportInvestmentsCSV: () => void
  importMode: 'replace' | 'merge'; setImportMode: (v: 'replace' | 'merge') => void
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  importError: string; importSuccess: boolean; exportSuccess: string | null; handleClearData: () => void
}

export function DataSettings({
  migrateFrom, setMigrateFrom, migrateTo, setMigrateTo, migrateMsg, handleMigrate,
  handleExportJSON, handleExportCSV, handleExportInvestmentsCSV, importMode, setImportMode,
  handleImport, importError, importSuccess, exportSuccess, handleClearData,
}: DataSettingsProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Migrate Month */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20">
            <ArrowRightLeft size={18} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Migrar dados entre meses</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Copie transações de um mês para outro</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200/30 dark:border-blue-700/30">
          Use esta ferramenta para <strong>copiar</strong> todas as transações de um mês para outro. Útil quando você registrou informações no mês errado ou quer começar um novo mês copiando dados do anterior.
        </p>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">Mês de origem</label>
            <input
              type="month"
              className="w-full border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={migrateFrom}
              onChange={(e) => setMigrateFrom(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col items-center justify-center pt-5">
            <ArrowRightLeft size={20} className="text-gray-400 dark:text-gray-500 rotate-90 sm:rotate-0" />
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 hidden sm:block">copia para</span>
          </div>
          
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">Mês de destino</label>
            <input
              type="month"
              className="w-full border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={migrateTo}
              onChange={(e) => setMigrateTo(e.target.value)}
            />
          </div>
          
          <Button onClick={handleMigrate} disabled={!migrateFrom || !migrateTo} className="mt-5">Migrar</Button>
        </div>
        
        {migrateMsg && (
          <p className={`text-sm mt-4 p-3 rounded-xl ${
            migrateMsg.includes('0 reg') || migrateMsg.includes('iguais') || migrateMsg.includes('Nenhum') 
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/30 dark:border-amber-700/30' 
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-700/30'
          }`}>
            {migrateMsg}
          </p>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-orange-500/10 dark:bg-orange-500/20">
            <Database size={18} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Dados</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie suas informações</p>
          </div>
        </div>

        {/* Export Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Download size={14} className="text-emerald-600" /> Exportar Dados
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Baixe seus dados para backup ou para usar em outras ferramentas.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button onClick={handleExportJSON} className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/30 dark:border-emerald-700/30 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer text-left group">
              <div className="p-2 rounded-lg bg-emerald-500/20"><Download size={18} className="text-emerald-600 dark:text-emerald-400" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Backup Completo</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Todas as transações</p>
              </div>
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/30 dark:border-blue-700/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer text-left group">
              <div className="p-2 rounded-lg bg-blue-500/20"><Download size={18} className="text-blue-600 dark:text-blue-400" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">Transações CSV</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Para Excel/Planilhas</p>
              </div>
            </button>
            <button onClick={handleExportInvestmentsCSV} className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200/30 dark:border-purple-700/30 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer text-left group">
              <div className="p-2 rounded-lg bg-purple-500/20"><TrendingUp size={18} className="text-purple-600 dark:text-purple-400" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">Investimentos CSV</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Carteira de investimentos</p>
              </div>
            </button>
          </div>
          {exportSuccess && (
            <p className="text-sm mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-700/30 flex items-center gap-2">
              <CheckCircle size={16} /> {exportSuccess}
            </p>
          )}
        </div>

        {/* Import Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Upload size={14} className="text-blue-600" /> Importar Dados
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Restaure um backup anterior ou importe dados de outro sistema.</p>
          
          {/* Mode selection */}
          <div className="flex gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="importMode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="w-4 h-4 text-indigo-600" />
              <div className="flex items-center gap-2">
                <Replace size={14} className="text-gray-505" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Substituir tudo</span>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="importMode" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="w-4 h-4 text-indigo-600" />
              <div className="flex items-center gap-2">
                <Merge size={14} className="text-gray-505" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Mesclar (juntar)</span>
              </div>
            </label>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {importMode === 'replace' ? '⚠️ Substituirá TODOS os dados atuais pelos dados do backup.' : '➕ Adicionará os dados do backup aos dados existentes (sem duplicar).'}
          </p>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 p-4 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 rounded-xl transition-colors">
              <div className="p-2 rounded-lg bg-indigo-500/20"><Upload size={18} className="text-indigo-600 dark:text-indigo-400" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Importar Backup</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Arquivo JSON do app</p>
              </div>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
          {importError && (
            <p className="text-sm mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200/30 dark:border-red-700/30 flex items-center gap-2">
              <AlertCircle size={16} /> {importError}
            </p>
          )}
          {importSuccess && (
            <p className="text-sm mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-700/30 flex items-center gap-2">
              <CheckCircle size={16} /> Dados importados com sucesso! Modo: {importMode === 'replace' ? 'Substituição' : 'Mesclagem'}
            </p>
          )}
        </div>

        {/* Danger Zone */}
        <div className="border-t border-gray-200/50 dark:border-white/10 pt-4 mt-1">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2"><Trash2 size={14} /> Zona de Perigo</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente.</p>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={handleClearData} className="justify-start h-12 w-full">Apagar todos os dados</Button>
        </div>
      </div>
    </div>
  )
}
