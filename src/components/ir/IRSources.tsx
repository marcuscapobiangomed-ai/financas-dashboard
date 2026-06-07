import { Building2, FileText, XCircle } from 'lucide-react'
import { AVAILABLE_BANKS, BankConnection } from '../../lib/openBanking'
import { uploadFile, UploadedFile } from '../../lib/pdfParser'
import { ParsedPDFList } from './ParsedPDFList'

interface IRSourcesProps {
  connectedBanks: BankConnection[]
  setConnectedBanks: React.Dispatch<React.SetStateAction<BankConnection[]>>
  uploadedFiles: UploadedFile[]
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  isUploading: boolean
  setIsUploading: (b: boolean) => void
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card-lg p-5 ${className}`}>{children}</div>
  )
}

export function IRSources({
  connectedBanks, setConnectedBanks, uploadedFiles, setUploadedFiles, isUploading, setIsUploading,
}: IRSourcesProps) {
  const handleDisconnectBank = (connectionId: string) => {
    setConnectedBanks(prev => prev.filter(b => b.id !== connectionId))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const result = await uploadFile(file)
        setUploadedFiles(prev => [...prev, result])
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const processedFiles = uploadedFiles.filter(f => f.status === 'success' && f.parsedData)

  return (
    <div className="space-y-6">
      <GlassCard className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Building2 size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Fontes de Dados</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Importe seus dados via Open Banking ou upload de PDFs</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/30">
            <h4 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-2">🔐 Open Banking</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Conecte diretamente sua conta bancária para importar automaticamente informes de rendimento.</p>
            <p className="text-xs text-amber-600 mt-2">⚠️ Requer backend configurado</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/30">
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2">📄 Upload de PDFs</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Envie seus informes de rendimento em PDF que we'll extrair os dados automaticamente.</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-indigo-500" /> Open Banking - Bancos Disponíveis
          </h3>
          <div className="space-y-2">
            {AVAILABLE_BANKS.map((bank) => {
              const isConnected = connectedBanks.some(b => b.bankId === bank.id)
              return (
                <div key={bank.id} className={`flex items-center justify-between p-3 rounded-lg border ${isConnected ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/30' : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{bank.logo}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{bank.name}</p>
                      <p className="text-xs text-gray-400">Em breve</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">Conectado</span>
                      <button onClick={() => handleDisconnectBank(connectedBanks.find(b => b.bankId === bank.id)?.id || '')} className="text-xs text-red-500 hover:underline">Desconectar</button>
                    </div>
                  ) : (
                    <button disabled={true} className="text-xs px-3 py-1 rounded-lg font-medium bg-gray-200 text-gray-400 cursor-not-allowed">Em breve</button>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/30">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Em desenvolvimento:</strong> O Open Banking permitirá conexão automática com seu banco para importar Informe de Rendimento, saldos e investimentos. 
              <a href="https://openbanking-brasil.github.io/areadesenvolvedor/" target="_blank" rel="noopener" className="underline"> Mais informações</a>.
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-emerald-500" /> Upload de Informe de Rendimento
          </h3>
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
            <input type="file" accept=".pdf" multiple onChange={handleFileUpload} className="hidden" id="pdf-upload" disabled={isUploading} />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <FileText size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{isUploading ? 'Processando...' : 'Clique para selecionar ou arraste PDFs aqui'}</p>
              <p className="text-xs text-gray-400 mt-1">Máximo 10MB por arquivo</p>
            </label>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Arquivos processados</h4>
              {uploadedFiles.map((file) => (
                <div key={file.id} className={`flex items-center justify-between p-3 rounded-lg border ${file.status === 'success' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/30' : file.status === 'error' ? 'bg-red-50/50 dark:bg-red-900/20 border-red-200/30' : 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200/30'}`}>
                  <div className="flex items-center gap-3 flex-1">
                    <FileText size={16} className={file.status === 'success' ? 'text-emerald-500' : file.status === 'error' ? 'text-red-500' : 'text-amber-500'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                      {file.status === 'success' && file.parsedData && (
                        <p className="text-xs text-gray-500">R$ {file.parsedData.totalIncome.toLocaleString('pt-BR')} • {file.parsedData.confidence}% confiança</p>
                      )}
                      {file.status === 'error' && <p className="text-xs text-red-500">{file.errorMessage}</p>}
                      {file.status === 'processing' && <p className="text-xs text-amber-500">Processando...</p>}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveFile(file.id)} className="text-gray-400 hover:text-red-500 cursor-pointer"><XCircle size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <ParsedPDFList processedFiles={processedFiles} />
    </div>
  )
}
