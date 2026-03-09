import { useCallback, useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'

type Direction = 'horizontal' | 'vertical'

interface ResizeHandleProps {
  direction?: Direction
  onResize: (delta: number) => void
  onResizeEnd?: () => void
  className?: string
}

export function ResizeHandle({
  direction = 'vertical',
  onResize,
  onResizeEnd,
  className,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false)
  const lastPos = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setDragging(true)
      lastPos.current = direction === 'vertical' ? e.clientY : e.clientX
    },
    [direction]
  )

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const current = direction === 'vertical' ? e.clientY : e.clientX
      const delta = current - lastPos.current
      lastPos.current = current
      onResize(delta)
    }

    const handleMouseUp = () => {
      setDragging(false)
      onResizeEnd?.()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, direction, onResize, onResizeEnd])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={clsx(
        'flex-shrink-0 transition-colors duration-100',
        direction === 'vertical'
          ? 'h-1 cursor-ns-resize hover:bg-accent/30'
          : 'w-1 cursor-ew-resize hover:bg-accent/30',
        dragging && 'bg-accent/40',
        className
      )}
    />
  )
}
