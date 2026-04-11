import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { TransactionForm } from './TransactionForm'

export function QuickAddFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors cursor-pointer active:scale-95"
        title="Adicionar lançamento"
      >
        <Plus size={24} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo Lançamento" size="md">
        <TransactionForm
          onSave={() => setOpen(false)}
          onCancel={() => setOpen(false)}
          showSaveAndNew
        />
      </Modal>
    </>
  )
}
