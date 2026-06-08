import { useState } from 'react'
import { Sparkles, Key, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { AppSettings } from '../../types/budget'

interface AISettingsProps {
  appSettings: AppSettings
  updateAppSettings: (updates: Partial<AppSettings>) => void
}

export function AISettings({ appSettings, updateAppSettings }: AISettingsProps) {
  const [apiKey, setApiKey] = useState(appSettings.geminiApiKey ?? '')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  function handleSave() {
    const trimmed = apiKey.trim()
    updateAppSettings({ geminiApiKey: trimmed || undefined })
  }

  async function handleTestKey() {
    const keyToTest = apiKey.trim()
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Insira uma chave antes de testar.' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const isGroq = keyToTest.startsWith('gsk_')
      let response: Response

      if (isGroq) {
        // Chamada leve para o endpoint de modelos do Groq para validar a chave
        const url = 'https://api.groq.com/openai/v1/models'
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${keyToTest}`
          }
        })
      } else {
        // Chamada leve para o endpoint de modelos do Gemini para validar a chave
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`
        response = await fetch(url)
      }
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: `Chave válida! A conexão com a API do ${isGroq ? 'Groq' : 'Gemini'} foi estabelecida.`
        })
        // Autosalvar ao testar com sucesso
        updateAppSettings({ geminiApiKey: keyToTest })
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errMsg = errorData.error?.message || 'Erro na autenticação'
        setTestResult({ success: false, message: `Chave inválida: ${errMsg}` })
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Erro de rede ao conectar com o serviço de IA.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl p-6 shadow-xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20">
          <Sparkles size={20} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Configurações de Inteligência Artificial</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configure sua chave da API do Groq ou Gemini para ler faturas e planilhas</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 max-w-xl">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Key size={14} className="text-gray-400" />
            Chave de API (Groq / Gemini)
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={handleSave}
              placeholder="Cole sua API Key da Groq (começa com gsk_) ou do Gemini aqui..."
              className="w-full pl-3 pr-10 py-2.5 bg-white/60 dark:bg-gray-900/40 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 dark:focus:ring-purple-400/40 dark:focus:border-purple-400 transition-all font-mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
            Sua chave é salva diretamente na sua conta de forma segura. <br />
            Você pode gerar uma chave no{' '}
            <a
              href="https://console.groq.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 underline hover:text-purple-700"
            >
              Groq Console
            </a>{' '}
            ou no{' '}
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 underline hover:text-purple-700"
            >
              Google AI Studio
            </a>.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleTestKey}
            disabled={testing}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-600/50 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md shadow-purple-500/20 cursor-pointer disabled:cursor-not-allowed"
          >
            {testing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Testando Conexão...
              </>
            ) : (
              'Testar e Salvar Chave'
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`flex items-start gap-3 p-4 rounded-2xl border text-sm animate-fade-in ${
              testResult.success
                ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30 text-green-800 dark:text-green-300'
                : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30 text-red-800 dark:text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
