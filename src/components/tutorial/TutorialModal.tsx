import { useState, useEffect } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Button } from '../ui/Button'
import { ChevronRight, ChevronLeft, CheckCircle, PlusCircle, CreditCard, TrendingUp, LayoutDashboard, Wallet, CalendarDays } from 'lucide-react'

export function TutorialModal() {
  const appSettings = useFinanceStore((s) => s.appSettings)
  const updateAppSettings = useFinanceStore((s) => s.updateAppSettings)
  const [step, setStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (!appSettings.hasSeenTutorial) {
      setTimeout(() => setIsVisible(true), 100)
    }
  }, [appSettings.hasSeenTutorial])

  if (appSettings.hasSeenTutorial) return null

  const handleFinish = () => {
    setIsVisible(false)
    setTimeout(() => {
      updateAppSettings({ hasSeenTutorial: true })
    }, 400)
  }

  const handleStepChange = (newStep: number) => {
    setAnimating(true)
    setTimeout(() => {
      setStep(newStep)
      setAnimating(false)
    }, 200)
  }

  const slides = [
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
      description: "Pronto! Fique à vontade para explorar e modificar as Configurações. Se precisar rever essas telas, procure pelo botão 'Refazer Tutorial'.",
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

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 dark:bg-black/80 backdrop-blur-md transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className={`bg-white dark:bg-gray-900 border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl shadow-indigo-900/20 w-full max-w-3xl overflow-hidden flex flex-col md:flex-row transform transition-transform duration-700 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
      >
        
        {/* Efeito Visual Esquerdo */}
        <div className={`hidden md:flex w-2/5 p-8 flex-col justify-between transition-colors duration-500 ${slides[step].color}`}>
           <div className="text-white/80 font-medium text-sm tracking-wider uppercase">Passo {step + 1} de {slides.length}</div>
           
           <div className={`transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
             <div className="p-4 bg-white/20 backdrop-blur-md rounded-3xl inline-block mb-8 shadow-lg">
               {slides[step].icon}
             </div>
             
             {slides[step].mockup}
           </div>

           <div className="flex gap-2">
             {slides.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-white' : 'w-3 bg-white/30'}`} />
             ))}
           </div>
        </div>

        {/* Conteúdo Direito */}
        <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center relative bg-white dark:bg-gray-900">
           
           {/* Mobile Top Visuals */}
           <div className={`md:hidden mb-8 transition-colors duration-500 rounded-3xl p-6 ${slides[step].color}`}>
              <div className="flex justify-between items-center mb-6 text-white/90">
                 {slides[step].icon}
                 <span className="text-xs font-bold uppercase track">Passo {step+1}/{slides.length}</span>
              </div>
              <div className={`transition-all duration-300 h-32 flex items-center justify-center ${animating ? 'opacity-0' : 'opacity-100'}`}>
                 {slides[step].mockup}
              </div>
           </div>

           <div className={`flex flex-col transition-all duration-300 ${animating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight">
                {slides[step].title}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed mb-10 h-28">
                {slides[step].description}
              </p>
           </div>

           {/* Controls */}
           <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button 
                variant="ghost" 
                onClick={() => handleStepChange(Math.max(0, step - 1))}
                className={`text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all ${step === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                 <ChevronLeft size={20} className="mr-1" /> Anterior
              </Button>

              {step < slides.length - 1 ? (
                 <Button onClick={() => handleStepChange(step + 1)} className={`text-white shadow-lg rounded-2xl px-8 py-6 transition-all duration-500 hover:-translate-y-1 ${slides[step].color}`}>
                   Avançar <ChevronRight size={20} className="ml-2" />
                 </Button>
              ) : (
                 <Button onClick={handleFinish} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-xl shadow-emerald-500/30 rounded-2xl px-8 py-6 transition-transform hover:-translate-y-1">
                   Começar agora <CheckCircle size={20} className="ml-2" />
                 </Button>
              )}
           </div>

           {/* Mobile dots indicator */}
           <div className="md:hidden flex justify-center gap-2 mt-8">
             {slides.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? `w-8 ${slides[step].color}` : 'w-2 bg-gray-200 dark:bg-gray-700'}`} />
             ))}
           </div>
        </div>

      </div>
    </div>
  )
}
