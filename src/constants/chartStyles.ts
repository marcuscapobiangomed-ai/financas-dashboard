import type { CSSProperties } from 'react'

export const TOOLTIP_STYLE: CSSProperties = {
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '12px',
}

export const AXIS_TICK_STYLE = { fontSize: 11, fill: '#9ca3af' }

export function formatYAxisK(value: number): string {
  return `R$${(value / 1000).toFixed(0)}k`
}
