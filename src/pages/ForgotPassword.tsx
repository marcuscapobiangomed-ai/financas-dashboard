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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <KeyRound size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financas</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Esqueci minha senha</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Informe seu email para receber um link de recuperacao
          </p>

          {sent ? (
            <div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-4 py-3">
              <p className="font-medium mb-1">Email enviado!</p>
              <p>Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium mt-2 inline-block">
                Voltar ao Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperacao'}
              </button>
            </form>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium">
            Voltar ao Login
          </Link>
        </p>
      </div>
    </div>
  )
}
