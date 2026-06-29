import type { CSSProperties } from 'react'

export const TOOLTIP_STYLE: CSSProperties = {
  borderRadius: '10px',
  border: '1px solid var(--chart-tooltip-border, #e5e7eb)',
  fontSize: '12px',
  backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
  color: 'var(--chart-tooltip-text, #374151)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '8px 12px',
}

export const AXIS_TICK_STYLE = { fontSize: 11, fill: '#9ca3af' }

export function formatYAxisK(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `R$${(value / 1000).toFixed(0)}k`
  }
  return `R$${value.toFixed(0)}`
}

export const CHART_GRID_COLOR = 'var(--chart-grid, #f3f4f6)'
