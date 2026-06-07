import { Link, Navigate } from 'react-router-dom'
import { UserPlus, Wallet } from 'lucide-react'
import { useRegister } from '../hooks/useRegister'
import { RegisterCards } from '../components/auth/RegisterCards'

export function Register() {
  const {
    user,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    initialBalance,
    setInitialBalance,
    cards,
    error,
    loading,
    success,
    addCard,
    removeCard,
    updateCard,
    handleRegisterSubmit,
  } = useRegister()

  if (user) return <Navigate to="/" replace />

  const inputClass = "w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300 transition-all font-sans"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 py-12 font-sans">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
            <UserPlus size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Finanças</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Criar sua conta</h2>
            <p className="text-sm text-gray-505 dark:text-gray-400 mb-8">Configure seu orçamento inicial para começar bem.</p>

            {success ? (
              <div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl px-4 py-4 border border-emerald-100 dark:border-emerald-800">
                <p className="font-semibold mb-1 text-base">Conta criada com sucesso!</p>
                <p className="opacity-90">Verifique seu email para confirmar o registro. Depois, você poderá fazer login e acessar seu painel.</p>
                <Link to="/login" className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors">
                  Ir para Login
                </Link>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleRegisterSubmit() }} className="flex flex-col gap-8">
                {/* Auth Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Acesso</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5 ml-0.5">E-mail</label>
                      <input
                        type="email"
                        required
                        className={inputClass}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5 ml-0.5">Senha</label>
                        <input
                          type="password"
                          required
                          className={inputClass}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 6 chars"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5 ml-0.5">Confirmar Senha</label>
                        <input
                          type="password"
                          required
                          className={inputClass}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a senha"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Finance Setup Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Configuração Financeira</h3>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-3">
                      <Wallet className="text-indigo-500" size={18} />
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Saldo Atual (Contas Correntes)</label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      className={inputClass}
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="Ex: 5000.00"
                    />
                    <p className="text-[10px] text-gray-550 mt-2 italic">Saldo total disponível hoje em suas contas bancárias.</p>
                  </div>

                  <RegisterCards
                    cards={cards}
                    addCard={addCard}
                    removeCard={removeCard}
                    updateCard={updateCard}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-4 py-3 border border-red-100 dark:border-red-900/50 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded-xl py-4 text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98] disabled:opacity-50 cursor-pointer uppercase tracking-widest mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Criando acesso...
                    </span>
                  ) : 'Finalizar e Começar'}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-6">
          Já possui uma conta?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold transition-colors">
            Entrar agora
          </Link>
        </p>
      </div>
    </div>
  )
}
