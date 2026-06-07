import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { AppSettings } from '../types/budget'
import { DEFAULT_APP_SETTINGS } from '../constants/defaultBudget'

export interface CardInput {
  id: string
  label: string
  limit: number
  closingDay: number
  dueDay: number
}

export function useRegister() {
  const { user, signUp } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // App Settings initial data
  const [initialBalance, setInitialBalance] = useState<string>('0')
  const [cards, setCards] = useState<CardInput[]>([
    { id: crypto.randomUUID(), label: '', limit: 0, closingDay: 10, dueDay: 20 }
  ])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function addCard() {
    setCards([...cards, { id: crypto.randomUUID(), label: '', limit: 0, closingDay: 10, dueDay: 20 }])
  }

  function removeCard(id: string) {
    if (cards.length <= 1) return
    setCards(cards.filter(c => c.id !== id))
  }

  function updateCard(id: string, field: keyof CardInput, value: string | number) {
    setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  async function handleRegisterSubmit() {
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    for (const card of cards) {
      if (!card.label.trim()) {
        setError('Dê um nome para todos os cartões.')
        return
      }
    }

    setLoading(true)

    const cardSections = cards.map(c => ({
      id: c.id,
      label: c.label,
      closingDay: Number(c.closingDay),
      dueDay: Number(c.dueDay)
    }))

    const defaultSectionLimits: Record<string, number> = {
      entradas: 0,
      despesas_fixas: 1000,
      gastos_diarios: 1500,
      extraordinario: 0,
    }
    cardSections.forEach(c => {
      const card = cards.find(sc => sc.id === c.id)
      defaultSectionLimits[c.id] = card ? Number(card.limit) : 0
    })

    const initialSettings = {
      initialBalance: Number(initialBalance),
      cardSections,
      defaultSectionLimits
    }

    const result = await signUp(email, password, initialSettings)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return {
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
    setCards,
    error,
    setError,
    loading,
    setLoading,
    success,
    setSuccess,
    addCard,
    removeCard,
    updateCard,
    handleRegisterSubmit,
  }
}
