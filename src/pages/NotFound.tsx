import { Link } from 'react-router-dom'
import { Compass, Home, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Page } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/common/EmptyState'

export function NotFoundPage() {
  return (
    <Page width="narrow">
      <div className="py-12">
        <EmptyState
          icon={<SearchX />}
          title="We could not find that page"
          message="The resource or exchange you were looking for may have been removed, or the demo data was reset."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link to="/" className={cn(buttonVariants())}>
                <Home />
                Back home
              </Link>
              <Link to="/discover" className={cn(buttonVariants({ variant: 'outline' }))}>
                <Compass />
                Browse resources
              </Link>
            </div>
          }
        />
      </div>
    </Page>
  )
}
