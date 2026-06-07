import { FileText } from 'lucide-react'
import { UploadedFile } from '../../lib/pdfParser'

interface ParsedPDFListProps {
  processedFiles: UploadedFile[]
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ParsedPDFList({ processedFiles }: ParsedPDFListProps) {
  return (
    <div className="glass-card-lg p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Dados Extraídos de PDFs</h3>
      {processedFiles.length === 0 ? (
        <div className="text-center py-6">
          <FileText size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum documento processado ainda</p>
        </div>
      ) : (
        <div className="space-y-4">
          {processedFiles.map((file) => (
            <div key={file.id} className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{file.parsedData?.sourceBank} - {file.parsedData?.year}</p>
                  {file.parsedData?.employeeName && (
                    <p className="text-xs text-gray-500">{file.parsedData.employeeName}</p>
                  )}
                </div>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-2 py-1 rounded-full">
                  {file.parsedData?.confidence}% confiança
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Renda Total</p>
                  <p className="font-semibold text-gray-800">{fmt(file.parsedData?.totalIncome || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Tributável</p>
                  <p className="font-semibold text-amber-600">{fmt(file.parsedData?.taxableIncome || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Isenta</p>
                  <p className="font-semibold text-emerald-600">{fmt(file.parsedData?.exemptIncome || 0)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
