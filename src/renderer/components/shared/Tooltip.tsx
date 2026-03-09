import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { clsx } from 'clsx'
import { type ReactNode } from 'react'

interface TooltipProps {
  children: ReactNode
  content: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
  className?: string
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      {children}
    </TooltipPrimitive.Provider>
  )
}

export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration,
  className,
}: TooltipProps) {
  if (!content) return <>{children}</>

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={4}
          className={clsx(
            'z-50 px-2 py-1 text-2xs font-medium rounded-md',
            'bg-bg-elevated text-text-primary border border-border',
            'shadow-md shadow-black/20',
            'animate-fade-in',
            'select-none',
            className
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-bg-elevated" width={8} height={4} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
