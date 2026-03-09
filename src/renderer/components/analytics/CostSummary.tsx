import { DollarSign, Zap, Hash, TrendingUp } from 'lucide-react'
import type { UsageData } from '@shared/types'

interface CostSummaryProps {
  usage: UsageData
}

function formatCurrency(value: number): string {
  if (value < 0.01) return '<$0.01'
  return `$${value.toFixed(2)}`
}

function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

export function CostSummary({ usage }: CostSummaryProps) {
  const { total, daily, byModel } = usage

  // Calculate daily average
  const activeDays = daily.filter((d) => d.inputTokens > 0 || d.outputTokens > 0).length
  const dailyAvgCost = activeDays > 0 ? total.cost / activeDays : 0

  // Projected monthly cost (based on last 7 days average)
  const last7Days = daily.slice(-7)
  const last7DaysCost = last7Days.reduce((sum, d) => sum + d.cost, 0)
  const projectedMonthly = last7Days.length > 0
    ? (last7DaysCost / last7Days.length) * 30
    : 0

  // Most used model
  const mostUsedModel = Object.entries(byModel).sort(
    (a, b) => (b[1].inputTokens + b[1].outputTokens) - (a[1].inputTokens + a[1].outputTokens)
  )[0]

  const cards = [
    {
      icon: DollarSign,
      label: 'Total Spend',
      value: formatCurrency(total.cost),
      sub: `${formatCurrency(dailyAvgCost)}/day avg`,
      color: 'text-accent' as const,
      bgColor: 'bg-accent-muted' as const,
    },
    {
      icon: Zap,
      label: 'Total Tokens',
      value: formatTokens(total.inputTokens + total.outputTokens),
      sub: `${formatTokens(total.inputTokens)} in / ${formatTokens(total.outputTokens)} out`,
      color: 'text-success' as const,
      bgColor: 'bg-success-muted' as const,
    },
    {
      icon: Hash,
      label: 'Sessions',
      value: String(total.sessions),
      sub: mostUsedModel ? `Primary: ${mostUsedModel[0]}` : 'No data',
      color: 'text-info' as const,
      bgColor: 'bg-info-muted' as const,
    },
    {
      icon: TrendingUp,
      label: 'Projected Monthly',
      value: formatCurrency(projectedMonthly),
      sub: 'Based on last 7 days',
      color: 'text-warning' as const,
      bgColor: 'bg-warning-muted' as const,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-bg-surface rounded-lg border border-border p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${card.bgColor}`}>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
            <span className="text-2xs text-text-secondary">{card.label}</span>
          </div>
          <div className="text-xl font-semibold text-text-primary font-mono">{card.value}</div>
          <div className="text-2xs text-text-muted truncate">{card.sub}</div>
        </div>
      ))}
    </div>
  )
}
