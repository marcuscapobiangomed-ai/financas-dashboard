import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionHeader } from './SectionHeader'
import { Info } from 'lucide-react'

describe('SectionHeader', () => {
  it('renders title and subtitle', () => {
    render(<SectionHeader icon={<Info size={16} />} title="Resumo Financeiro" subtitle="Visão geral do mês" />)

    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument()
    expect(screen.getByText('Visão geral do mês')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    const { container } = render(
      <SectionHeader icon={<Info size={16} data-testid="icon" />} title="Teste" subtitle="Subtítulo" />
    )

    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
