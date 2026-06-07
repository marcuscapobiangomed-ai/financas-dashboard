import { Plus, Repeat, CreditCard } from 'lucide-react'
import { useRecurringForm, monthsDiff, addMonths } from '../hooks/useRecurringForm'
import { TemplateRow } from '../components/recurring/TemplateRow'
import { RecurringModal } from '../components/recurring/RecurringModal'
import { Button } from '../components/ui/Button'

export function Recurring() {
  const {
    recurringTemplates,
    transactions,
    sectionLabels,
    expenseSectionIds,
    modalOpen,
    setModalOpen,
    editingId,
    form,
    setForm,
    applyMsg,
    availableCategories,
    openNew,
    openEdit,
    handleSectionChange,
    handleSubmit,
    handleDelete,
    handleToggle,
    handleApply,
    formatMonthKey,
  } = useRecurringForm()

  const fixos = recurringTemplates.filter((t) => !t.installmentTotal)
  const parcelas = recurringTemplates.filter((t) => !!t.installmentTotal)

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recorrentes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleApply}>
            Aplicar
          </Button>
          <Button icon={<Plus size={14} />} onClick={openNew}>
            Novo
          </Button>
        </div>
      </div>

      {applyMsg && (
        <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-4 py-2">{applyMsg}</p>
      )}

      {recurringTemplates.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-10 text-center">
          <Repeat size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum lançamento recorrente cadastrado.</p>
          <p className="text-xs text-gray-400 dark:text-gray-505 mt-1">Adicione gastos fixos mensais ou parcelas para aplicá-los automaticamente.</p>
        </div>
      )}

      {/* Fixos */}
      {fixos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Repeat size={14} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gastos Fixos</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{fixos.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {fixos.map((t) => (
              <TemplateRow
                key={t.id}
                t={t}
                currentMonthKey={form.startMonth}
                transactions={transactions}
                sectionLabels={sectionLabels}
                monthsDiff={monthsDiff}
                formatMonthKey={formatMonthKey}
                handleToggle={handleToggle}
                openEdit={openEdit}
                handleDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Parcelas */}
      {parcelas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Parcelas</h2>
            <span className="text-xs text-gray-400 dark:text-gray-505 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{parcelas.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {parcelas.map((t) => (
              <TemplateRow
                key={t.id}
                t={t}
                currentMonthKey={form.startMonth}
                transactions={transactions}
                sectionLabels={sectionLabels}
                monthsDiff={monthsDiff}
                formatMonthKey={formatMonthKey}
                handleToggle={handleToggle}
                openEdit={openEdit}
                handleDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <RecurringModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingId={editingId}
        form={form}
        setForm={setForm}
        expenseSectionIds={expenseSectionIds}
        sectionLabels={sectionLabels}
        availableCategories={availableCategories}
        handleSectionChange={handleSectionChange}
        onSubmit={handleSubmit}
        addMonths={addMonths}
        formatMonthKey={formatMonthKey}
      />
    </div>
  )
}
