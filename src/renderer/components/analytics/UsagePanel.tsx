import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { EmptyState } from '../shared/EmptyState'
import { TokenChart } from './TokenChart'
import { CostSummary } from './CostSummary'
import { ModelBreakdown } from './ModelBreakdown'
import type { UsageData } from '@shared/types'

export function UsagePanel() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchUsage = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const data = await window.electronAPI.getUsage()
      setUsage(data)
    } catch (err) {
      console.error('Failed to fetch usage:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
          Analyzing sessions...
        </div>
      </div>
    )
  }

  if (!usage || (usage.daily.length === 0 && usage.total.inputTokens === 0)) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={<BarChart3 className="w-10 h-10" />}
          title="No usage data yet"
          description="Usage data will appear here after you start chatting with Claude"
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-5 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Usage Dashboard</h2>
          <button
            onClick={() => fetchUsage(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary
                       bg-bg-elevated rounded-md border border-border hover:border-border-strong
                       hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin-slow' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <CostSummary usage={usage} />

        {/* Token Chart */}
        <div className="bg-bg-surface rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">Token Usage Over Time</h3>
          <TokenChart daily={usage.daily} />
        </div>

        {/* Model Breakdown */}
        <div className="bg-bg-surface rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">Usage by Model</h3>
          <ModelBreakdown byModel={usage.byModel} totalCost={usage.total.cost} />
        </div>
      </div>
    </div>
  )
}
