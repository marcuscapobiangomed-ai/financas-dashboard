import { useMemo } from 'react'
import {
  TrendingUp, Landmark, Wallet, ArrowDownCircle,
  CalendarDays,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useCashFlowProjection } from '../hooks/useCashFlowProjection'
import { formatCurrency } from '../utils/currency'
import { TOOLTIP_STYLE } from '../constants/chartStyles'

function formatShortMonth(label: string): string {
  const parts = label.split(' ')
  if (parts.length >= 2) return `${parts[0].slice(0, 3)} ${parts[1]}`
  return label
}

export function CashFlow() {
  const projection = useCashFlowProjection(12)

  const chartData = useMemo(() => projection.months.map((m) => ({
    label: formatShortMonth(m.label),
    accumulatedBalance: m.accumulatedBalance,
    isProjected: m.isProjected,
  })), [projection.months])

  const futureMonths = useMemo(() => projection.months.filter((m) => m.isProjected), [projection.months])

  if (projection.months.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Landmark size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado financeiro encontrado.</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Adicione transações e recibos recorrentes para ver o fluxo de caixa.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Landmark size={22} className="text-indigo-600" />
          Fluxo de Caixa
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Acompanhe seu saldo acumulado ao longo do tempo e projeções futuras baseadas em recibos recorrentes.
        </p>
      </div>

      {/* Current balance hero */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-indigo-100 text-sm font-medium flex items-center gap-1.5">
          <Landmark size={14} />
          Saldo Atual em Conta
        </p>
        <p className="text-3xl font-bold mt-1">
          {formatCurrency(projection.currentBalance)}
        </p>
        {projection.initialBalance > 0 && (
          <p className="text-indigo-200 text-xs mt-2">
            Inclui saldo inicial de {formatCurrency(projection.initialBalance)}
          </p>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <Wallet size={15} />
            <span className="text-xs font-semibold uppercase tracking-wide">Receitas Futuras</span>
          </div>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(projection.totalFutureIncome)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            Próximos {projection.months.filter((m) => m.isProjected).length} meses
          </p>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-red-500 dark:text-red-400 mb-1">
            <ArrowDownCircle size={15} />
            <span className="text-xs font-semibold uppercase tracking-wide">Despesas Futuras</span>
          </div>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">
            {formatCurrency(projection.totalFutureExpenses)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            Próximos {projection.months.filter((m) => m.isProjected).length} meses
          </p>
        </div>

        <div className="glass-panel p-4">
          <div className={`flex items-center gap-2 mb-1 ${projection.totalFutureIncome - projection.totalFutureExpenses >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-500'}`}>
            <TrendingUp size={15} />
            <span className="text-xs font-semibold uppercase tracking-wide">Saldo Projetado</span>
          </div>
          <p className={`text-lg font-bold ${projection.projectedBalanceAfter >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
            {formatCurrency(projection.projectedBalanceAfter)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            Após período projetado
          </p>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <CalendarDays size={15} />
            <span className="text-xs font-semibold uppercase tracking-wide">Meses Exibidos</span>
          </div>
          <p className="text-lg font-bold text-violet-700 dark:text-violet-300">
            {projection.months.length}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {projection.months.filter((m) => !m.isProjected).length} reais · {futureMonths.length} projetados
          </p>
        </div>
      </div>

      {/* Accumulated balance chart */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-indigo-500" />
          Evolução do Saldo Acumulado
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f3f4f6)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), 'Saldo Acumulado']}
              contentStyle={TOOLTIP_STYLE}
            />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Area
              type="monotone"
              dataKey="accumulatedBalance"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#balanceGrad)"
              dot={{ r: 3, fill: '#6366f1' }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Realizado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-300" /> Projetado
          </span>
        </div>
      </div>

      {/* Monthly table */}
      <div className="glass-panel p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <CalendarDays size={15} className="text-indigo-500" />
          Detalhamento Mensal
        </h3>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-2 pr-4 font-medium">Mês</th>
              <th className="text-right py-2 px-2 font-medium">Receitas</th>
              <th className="text-right py-2 px-2 font-medium">Despesas</th>
              <th className="text-right py-2 px-2 font-medium">Saldo</th>
              <th className="text-right py-2 pl-2 font-medium">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {projection.months.map((m) => (
              <tr
                key={m.monthKey}
                className={`border-b border-gray-50 dark:border-gray-800 last:border-0 ${
                  m.isProjected ? 'opacity-50' : ''
                } ${m.isCurrentMonth ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
              >
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    {m.isCurrentMonth && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    )}
                    <span className={`font-medium text-gray-700 dark:text-gray-300 text-xs ${
                      m.isCurrentMonth ? 'text-indigo-700 dark:text-indigo-400' : ''
                    }`}>
                      {m.label}
                    </span>
                    {m.isProjected && (
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 italic">proj.</span>
                    )}
                    {m.isCurrentMonth && (
                      <span className="text-[9px] text-indigo-500 font-medium">atual</span>
                    )}
                  </div>
                </td>
                <td className="text-right py-2.5 px-2 text-emerald-600 dark:text-emerald-400 font-medium tabular-nums text-xs">
                  {formatCurrency(m.income)}
                </td>
                <td className="text-right py-2.5 px-2 text-red-500 dark:text-red-400 font-medium tabular-nums text-xs">
                  {formatCurrency(m.expenses)}
                </td>
                <td className={`text-right py-2.5 px-2 font-medium tabular-nums text-xs ${
                  m.balance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(m.balance)}
                </td>
                <td className={`text-right py-2.5 pl-2 font-bold tabular-nums text-xs ${
                  m.accumulatedBalance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(m.accumulatedBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
