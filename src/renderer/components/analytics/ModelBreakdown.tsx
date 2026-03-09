interface ModelBreakdownProps {
  byModel: Record<string, { inputTokens: number; outputTokens: number; cost: number }>
  totalCost: number
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

function formatCurrency(value: number): string {
  if (value < 0.01 && value > 0) return '<$0.01'
  return `$${value.toFixed(2)}`
}

export function ModelBreakdown({ byModel, totalCost }: ModelBreakdownProps) {
  const models = Object.entries(byModel)
    .sort((a, b) => b[1].cost - a[1].cost)

  if (models.length === 0) {
    return (
      <div className="text-center text-text-muted text-xs py-6">
        No model data available
      </div>
    )
  }

  // Color per model
  const modelColors: Record<string, string> = {
    'Claude Opus': '#7c6af7',
    'Claude Sonnet': '#60a5fa',
    'Claude Haiku': '#4ade80',
  }
  const fallbackColors = ['#fb923c', '#f87171', '#a78bfa', '#34d399']

  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_100px_100px_80px_60px] gap-2 text-2xs text-text-muted px-2">
        <span>Model</span>
        <span className="text-right">Input Tokens</span>
        <span className="text-right">Output Tokens</span>
        <span className="text-right">Cost</span>
        <span className="text-right">Share</span>
      </div>

      {/* Table rows */}
      {models.map(([model, data], i) => {
        const share = totalCost > 0 ? (data.cost / totalCost) * 100 : 0
        const color = modelColors[model] || fallbackColors[i % fallbackColors.length]

        return (
          <div key={model} className="space-y-1.5">
            <div className="grid grid-cols-[1fr_100px_100px_80px_60px] gap-2 items-center text-xs px-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-text-primary truncate">{model}</span>
              </div>
              <span className="text-right text-text-secondary font-mono">
                {formatTokens(data.inputTokens)}
              </span>
              <span className="text-right text-text-secondary font-mono">
                {formatTokens(data.outputTokens)}
              </span>
              <span className="text-right text-text-primary font-mono">
                {formatCurrency(data.cost)}
              </span>
              <span className="text-right text-text-secondary font-mono">
                {share.toFixed(0)}%
              </span>
            </div>

            {/* Cost bar */}
            <div className="mx-2 h-1 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(share, 1)}%`,
                  backgroundColor: color,
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
        )
      })}

      {/* Total row */}
      <div className="grid grid-cols-[1fr_100px_100px_80px_60px] gap-2 items-center text-xs px-2 pt-2 border-t border-border">
        <span className="text-text-secondary font-medium">Total</span>
        <span className="text-right text-text-primary font-mono font-medium">
          {formatTokens(models.reduce((sum, [, d]) => sum + d.inputTokens, 0))}
        </span>
        <span className="text-right text-text-primary font-mono font-medium">
          {formatTokens(models.reduce((sum, [, d]) => sum + d.outputTokens, 0))}
        </span>
        <span className="text-right text-text-primary font-mono font-medium">
          {formatCurrency(totalCost)}
        </span>
        <span className="text-right text-text-secondary font-mono">100%</span>
      </div>
    </div>
  )
}
