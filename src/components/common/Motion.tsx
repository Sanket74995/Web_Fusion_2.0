import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const

/** Wraps a route so navigation reads as a soft cross-fade rather than a jump. */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Fade-and-rise on scroll into view. Runs once. */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
  as = 'div',
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'section' | 'li'
}) {
  const reduce = useReducedMotion()
  const Comp = motion[as]
  if (reduce) return <div className={className}>{children}</div>
  return (
    <Comp
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.42, ease: EASE, delay }}
      className={cn('gpu', className)}
    >
      {children}
    </Comp>
  )
}

/** Staggered list container — children animate in one after another. */
export function Stagger({
  children,
  className,
  delay = 0,
  step = 0.055,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  step?: number
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: step, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={cn('gpu', className)}
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  )
}

/** Counts a number up when it enters view — used on impact metrics. */
export function CountUp({
  value,
  format,
  className,
  duration = 900,
}: {
  value: number
  format?: (n: number) => string
  className?: string
  duration?: number
}) {
  const reduce = useReducedMotion()
  const render = format ?? ((n: number) => Math.round(n).toLocaleString('en-IN'))
  if (reduce) return <span className={className}>{render(value)}</span>
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <Counter value={value} duration={duration} render={render} />
    </motion.span>
  )
}

function Counter({
  value,
  duration,
  render,
}: {
  value: number
  duration: number
  render: (n: number) => string
}) {
  const [shown, setShown] = useState(0)
  const frame = useRef<number>()

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic
      setShown(value * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [value, duration])

  return <>{render(shown)}</>
}
