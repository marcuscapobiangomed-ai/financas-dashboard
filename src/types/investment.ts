export interface Investment {
  id: string
  name: string                 // "Tesouro Direto", "CDB Nubank"
  principal: number            // current amount invested
  monthlyYieldPercent: number  // e.g. 0.8 for 0.8%/month
  startMonth: string           // "2026-01"
  isActive: boolean
  notes?: string
}
