import { ReactNode } from 'react'
import { Wallet, TrendingUp, PlusCircle, CreditCard, CalendarDays, CheckCircle, LayoutDashboard } from 'lucide-react'

export interface Slide {
  title: string
  description: string
  icon: ReactNode
  color: string
  mockup: ReactNode
}

export const slides: Slide[] = [
  {
    title: "Controle Total!",
    description: "Bem-vindo(a) ao seu novo Dashboard Financeiro. Aqui, cada centavo importa. Vamos aprender em menos de 1 minuto como transformar suas finanças.",
    icon: <LayoutDashboard size={40} className="text-white" />,
    color: "bg-indigo-500",
    mockup: (
      <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl w-full">
        <div className="h-2 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-full mb-2"></div>
        <div className="h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center px-4 gap-3">
           <Wallet size={16} className="text-indigo-500" /> 
           <div className="h-2 w-1/2 bg-indigo-200 dark:bg-indigo-700 rounded-full"></div>
        </div>
        <div className="h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center px-4 gap-3">
           <TrendingUp size={16} className="text-emerald-500" /> 
           <div className="h-2 w-1/3 bg-emerald-200 dark:bg-emerald-700 rounded-full"></div>
        </div>
      </div>
    )
  },
  {
    title: "Lançamentos Ágeis",
    description: "A qualquer momento, clique no grande botão flutuante (+) no canto da tela. Ele é sua ferramenta mágica para adicionar Despesas ou Entradas.",
    icon: <PlusCircle size={40} className="text-white" />,
    color: "bg-emerald-500",
    mockup: (
      <div className="flex items-center justify-center p-6 w-full relative">
        <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
        <button className="relative z-10 w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/40 flex items-center justify-center transition-transform hover:scale-110">
          <PlusCircle size={32} className="text-white" />
        </button>
      </div>
    )
  },
  {
    title: "Faturas de Cartão",
    description: "Gerencie seus cartões na aba Configurações. Ao definir as datas de 'Fechamento' e 'Vencimento', o sistema decide automaticamente pra qual mês sua compra vai!",
    icon: <CreditCard size={40} className="text-white" />,
    color: "bg-blue-500",
    mockup: (
      <div className="flex flex-col p-4 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl w-full text-white shadow-lg space-y-4">
         <div className="flex justify-between items-center opacity-80">
           <CreditCard size={20} />
           <div className="h-2 w-8 bg-white/40 rounded-full"></div>
         </div>
         <div>
           <p className="text-[10px] opacity-70 uppercase tracking-wider mb-1">Mês da Fatura</p>
           <p className="font-semibold tracking-widest text-lg opacity-90">•••• •••• •••• 1234</p>
         </div>
         <div className="flex justify-between mt-2 pt-2 border-t border-white/20 text-xs font-medium">
           <span className="flex items-center gap-1"><CalendarDays size={12}/> Fec: dia 10</span>
           <span className="flex items-center gap-1"><CalendarDays size={12}/> Ven: dia 20</span>
         </div>
      </div>
    )
  },
  {
    title: "Investimentos Inteligentes",
    description: "Conecte seus investimentos às taxas CDI e IPCA reais. Nós calculamos o rendimento automático todo mês pra você não esquecer de registrar seu lucro.",
    icon: <TrendingUp size={40} className="text-white" />,
    color: "bg-amber-500",
    mockup: (
      <div className="flex items-end justify-between p-4 bg-white/5 border border-white/10 rounded-2xl w-full h-32">
        {[40, 60, 50, 80, 100].map((h, i) => (
           <div key={i} className="w-1/6 bg-amber-500/80 rounded-t-lg transition-all duration-1000 ease-out" style={{ height: `${h}%`, animationDelay: `${i*100}ms` }}></div>
        ))}
      </div>
    )
  },
  {
    title: "Comece sua Jornada",
    description: "Pronto! Fique à voltar para explorar e modificar as Configurações. Se precisar rever essas telas, procure pelo botão 'Refazer Tutorial'.",
    icon: <CheckCircle size={40} className="text-white" />,
    color: "bg-indigo-600",
    mockup: (
      <div className="flex flex-col items-center justify-center p-4">
         <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
            <CheckCircle size={64} className="text-green-500 relative z-10 animate-bounce" />
         </div>
      </div>
    )
  }
]
