import { Settings as SettingsIcon, Wallet, CreditCard, Database, Sparkles } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import { BudgetSettings } from '../components/settings/BudgetSettings'
import { CardSettings } from '../components/settings/CardSettings'
import { DataSettings } from '../components/settings/DataSettings'
import { AISettings } from '../components/settings/AISettings'

export function Settings() {
  const {
    appSettings,
    updateAppSettings,
    transactions,
    tab,
    setTab,
    importError,
    importSuccess,
    importMode,
    setImportMode,
    exportSuccess,
    migrateFrom,
    setMigrateFrom,
    migrateTo,
    setMigrateTo,
    migrateMsg,
    editingCardId,
    setEditingCardId,
    editingLabel,
    setEditingLabel,
    notifPermission,
    setNotifPermission,
    userId,
    cardSections,
    startEditCard,
    saveCardLabel,
    handleAddCard,
    handleCardBillingChange,
    handleCardBillingBlur,
    handleRemoveCard,
    handleCardLimitChange,
    handleLimitChange,
    handleExportJSON,
    handleExportCSV,
    handleExportInvestmentsCSV,
    handleImport,
    handleMigrate,
    handleClearData,
  } = useSettings()

  const tabs = [
    { id: 'budget', label: 'Orçamento', icon: Wallet },
    { id: 'cards', label: 'Cartões', icon: CreditCard },
    { id: 'data', label: 'Dados', icon: Database },
    { id: 'ai', label: 'Integração IA', icon: Sparkles },
  ] as const

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20">
          <SettingsIcon size={24} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Personalize o app conforme sua necessidade</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 p-1.5 rounded-2xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
              tab === id 
                ? 'bg-indigo-600 dark:bg-indigo-50 text-white shadow-lg shadow-indigo-500/30' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Budget Settings */}
      {tab === 'budget' && (
        <BudgetSettings
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
          handleLimitChange={handleLimitChange}
          notifPermission={notifPermission}
          setNotifPermission={setNotifPermission}
          userId={userId}
        />
      )}

      {/* Card Settings */}
      {tab === 'cards' && (
        <CardSettings
          cardSections={cardSections}
          appSettings={appSettings}
          editingCardId={editingCardId}
          editingLabel={editingLabel}
          setEditingLabel={setEditingLabel}
          setEditingCardId={setEditingCardId}
          startEditCard={startEditCard}
          saveCardLabel={saveCardLabel}
          handleAddCard={handleAddCard}
          handleCardLimitChange={handleCardLimitChange}
          handleCardBillingChange={handleCardBillingChange}
          handleCardBillingBlur={handleCardBillingBlur}
          handleRemoveCard={handleRemoveCard}
        />
      )}

      {/* Data Settings */}
      {tab === 'data' && (
        <DataSettings
          migrateFrom={migrateFrom}
          setMigrateFrom={setMigrateFrom}
          migrateTo={migrateTo}
          setMigrateTo={setMigrateTo}
          migrateMsg={migrateMsg}
          handleMigrate={handleMigrate}
          handleExportJSON={handleExportJSON}
          handleExportCSV={handleExportCSV}
          handleExportInvestmentsCSV={handleExportInvestmentsCSV}
          importMode={importMode}
          setImportMode={setImportMode}
          handleImport={handleImport}
          importError={importError}
          importSuccess={importSuccess}
          exportSuccess={exportSuccess}
          handleClearData={handleClearData}
        />
      )}

      {/* AI Settings */}
      {tab === 'ai' && (
        <AISettings
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
        />
      )}

      <p className="text-xs text-gray-400 dark:text-gray-505 text-center">
        Dados sincronizados com Supabase · {transactions.length} transações registradas
      </p>
    </div>
  )
}
