import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Sun
        className={cn(
          'absolute size-[1.125rem] transition-all duration-300',
          isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
        )}
      />
      <Moon
        className={cn(
          'absolute size-[1.125rem] transition-all duration-300',
          isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0',
        )}
      />
    </button>
  )
}
