import { clsx } from 'clsx'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface LoadingSpinnerProps {
  size?: SpinnerSize
  label?: string
  className?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-3.5 h-3.5 border-[1.5px]',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-2',
}

export function LoadingSpinner({ size = 'md', label, className }: LoadingSpinnerProps) {
  return (
    <div className={clsx('inline-flex items-center gap-2', className)} role="status">
      <div
        className={clsx(
          'rounded-full animate-spin',
          'border-text-muted border-t-accent',
          sizeClasses[size]
        )}
      />
      {label && <span className="text-xs text-text-secondary">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  )
}
