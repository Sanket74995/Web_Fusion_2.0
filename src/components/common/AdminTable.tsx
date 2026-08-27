import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  /** Right-align numeric columns. */
  align?: 'left' | 'right'
  /** Hide on small screens to keep the table readable. */
  hideBelow?: 'sm' | 'md' | 'lg'
  className?: string
  render: (row: T) => React.ReactNode
}

const HIDE = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}

/** Admin data table — sticky header, zebra-free, quiet borders. */
export function AdminTable<T extends { id: string }>({
  rows,
  columns,
  empty,
  className,
  onRowClick,
}: {
  rows: T[]
  columns: Column<T>[]
  empty?: { title: string; message?: string }
  className?: string
  onRowClick?: (row: T) => void
}) {
  if (!rows.length) {
    return (
      <EmptyState
        compact
        title={empty?.title ?? 'Nothing here yet'}
        message={empty?.message}
        className={className}
      />
    )
  }

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border bg-card', className)}>
      <table className="w-full min-w-[38rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground',
                  c.align === 'right' ? 'text-right' : 'text-left',
                  c.hideBelow && HIDE[c.hideBelow],
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-border last:border-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-muted/40',
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-4 py-3 align-middle',
                    c.align === 'right' ? 'text-right' : 'text-left',
                    c.hideBelow && HIDE[c.hideBelow],
                    c.className,
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
