import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

export function ForgotPassword() {
  const { user, resetPassword } = useAuthStore()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await resetPassword(email)
    if (result.error) {
      setError(result.error)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gray-50 dark:bg-gray-900 font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center justify-center mb-8 animate-slide-up">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none mb-4">
            <KeyRound size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Finanças</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">Recuperação de conta</p>
        </div>

        <div className="glass-panel-lg p-8 animate-slide-up" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Esqueci minha senha</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Informe seu e-mail para receber um link de recuperação.
          </p>

          {sent ? (
            <div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-900/30 backdrop-blur-sm rounded-xl px-4 py-4 border border-emerald-100 dark:border-emerald-800/50 animate-slide-in">
              <p className="font-bold mb-1 text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                E-mail enviado!
              </p>
              <p className="opacity-90 leading-relaxed">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <Link to="/login" className="mt-4 w-full flex items-center justify-center bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg py-2.5 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-200 dark:border-gray-700">
                Voltar ao Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1.5 ml-1">E-mail</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="input-glass"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-red-100 dark:border-red-900/50 flex items-center gap-2 animate-slide-up">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200/50 dark:shadow-none active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : 'Enviar link de recuperação'}
              </button>
            </form>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-6 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold transition-colors">
            Voltar ao Login
          </Link>
        </p>
      </div>
    </div>
  )
}
