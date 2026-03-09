import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import { clsx } from 'clsx'
import { type ReactNode } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  onSelect: () => void
}

export interface ContextMenuSeparator {
  type: 'separator'
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator

interface ContextMenuProps {
  children: ReactNode
  items: ContextMenuEntry[]
}

function isSeparator(entry: ContextMenuEntry): entry is ContextMenuSeparator {
  return 'type' in entry && entry.type === 'separator'
}

export function ContextMenu({ children, items }: ContextMenuProps) {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          className={clsx(
            'z-50 min-w-[160px] py-1 rounded-lg',
            'bg-bg-elevated border border-border',
            'shadow-lg shadow-black/30',
            'animate-fade-in'
          )}
        >
          {items.map((entry, i) =>
            isSeparator(entry) ? (
              <ContextMenuPrimitive.Separator
                key={i}
                className="h-px my-1 bg-border"
              />
            ) : (
              <ContextMenuPrimitive.Item
                key={i}
                disabled={entry.disabled}
                onSelect={entry.onSelect}
                className={clsx(
                  'flex items-center gap-2 px-2.5 py-1.5 text-xs outline-none cursor-default',
                  'data-[highlighted]:bg-accent/10',
                  entry.disabled && 'opacity-40 pointer-events-none',
                  entry.danger
                    ? 'text-error data-[highlighted]:text-error'
                    : 'text-text-primary'
                )}
              >
                {entry.icon && <span className="w-3.5 h-3.5 flex-shrink-0">{entry.icon}</span>}
                <span className="flex-1">{entry.label}</span>
                {entry.shortcut && (
                  <span className="text-2xs text-text-muted ml-4">{entry.shortcut}</span>
                )}
              </ContextMenuPrimitive.Item>
            )
          )}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  )
}
