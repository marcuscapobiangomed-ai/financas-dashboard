import { useState, useEffect } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Button } from '../ui/Button'
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react'
import { slides } from './tutorialSlides'

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

