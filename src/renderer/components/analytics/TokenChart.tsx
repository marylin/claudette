import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { DailyUsage } from '@shared/types'

type DateRange = '7d' | '14d' | '30d' | 'all'

interface TokenChartProps {
  daily: DailyUsage[]
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TokenChart({ daily }: TokenChartProps) {
  const [range, setRange] = useState<DateRange>('30d')

  const filteredData = useMemo(() => {
    if (range === 'all') return daily

    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return daily.filter((d) => d.date >= cutoffStr)
  }, [daily, range])

  if (filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-text-muted text-xs">
        No data for this time range
      </div>
    )
  }

  return (
    <div>
      {/* Range selector */}
      <div className="flex items-center gap-1 mb-4">
        {(['7d', '14d', '30d', 'all'] as DateRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2.5 py-1 text-2xs rounded-md transition-colors ${
              range === r
                ? 'bg-accent text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            {r === 'all' ? 'All' : r}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={filteredData} barGap={1} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#8b92a5', fontSize: 10 }}
            axisLine={{ stroke: '#2a2d35' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatTokens}
            tick={{ fill: '#8b92a5', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: '#7c6af708' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconSize={8}
            iconType="circle"
          />
          <Bar
            dataKey="inputTokens"
            name="Input"
            fill="#7c6af7"
            radius={[2, 2, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="outputTokens"
            name="Output"
            fill="#4ade80"
            radius={[2, 2, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0]?.payload as DailyUsage
  return (
    <div className="bg-bg-elevated border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text-primary mb-1.5">
        {formatDate(label)}
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-2xs">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-text-secondary">Input:</span>
          <span className="text-text-primary font-mono">{formatTokens(data.inputTokens)}</span>
        </div>
        <div className="flex items-center gap-2 text-2xs">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-text-secondary">Output:</span>
          <span className="text-text-primary font-mono">{formatTokens(data.outputTokens)}</span>
        </div>
        <div className="flex items-center gap-2 text-2xs pt-1 border-t border-border">
          <span className="text-text-secondary">Cost:</span>
          <span className="text-text-primary font-mono">${data.cost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
