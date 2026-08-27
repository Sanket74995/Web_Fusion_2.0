import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border font-medium leading-none transition-colors [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-muted text-muted-foreground',
        primary: 'border-primary/15 bg-primary-soft text-primary',
        success: 'border-primary/15 bg-primary-soft text-primary',
        warning: 'border-warning/20 bg-warning-soft text-warning',
        danger: 'border-destructive/20 bg-destructive-soft text-destructive',
        info: 'border-info/20 bg-info-soft text-info',
        outline: 'border-border bg-card text-foreground',
        ink: 'border-transparent bg-foreground text-background',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-2xs [&_svg]:size-3',
        md: 'px-2 py-1 text-xs [&_svg]:size-3.5',
        lg: 'px-2.5 py-1.5 text-[0.8125rem] [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'md' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { badgeVariants }
