import { Link } from 'react-router-dom'
import { Heart, Compass } from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { ResourceCard } from '@/components/common/ResourceCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Reveal, Stagger, StaggerItem } from '@/components/common/Motion'

export function WishlistPage() {
  const { state, getUser } = useStore()

  const savedIds = state.wishlistResourceIds ?? []
  const savedResources = state.resources.filter((r) => savedIds.includes(r.id))

  return (
    <Page>
      <PageHeader
        eyebrow={<span className="text-sm text-muted-foreground">Saved Items</span>}
        title="My Wishlist"
        subtitle="Bookmarked calculators, cameras, textbooks and gear for upcoming projects"
      />

      {savedResources.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-8 text-muted-foreground" />}
          title="Your wishlist is empty"
          message="Click the heart icon on any resource card to save it for later."
          action={
            <Link to="/discover">
              <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                <Compass className="size-4" />
                Browse Discover
              </button>
            </Link>
          }
        />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedResources.map((r) => (
            <StaggerItem key={r.id}>
              <Reveal>
                <ResourceCard resource={r} owner={getUser(r.ownerId)} />
              </Reveal>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Page>
  )
}
