import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Compass, HelpCircle, LayoutGrid, Navigation, Package, Sparkles, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Footer, Navbar } from './Navbar'

const TABS = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/ai', label: 'AI Find', icon: Sparkles },
  { to: '/map', label: 'Map', icon: Navigation },
  { to: '/wanted', label: 'Wanted', icon: HelpCircle },
  { to: '/leaderboard', label: 'Ranks', icon: Trophy },
  { to: '/borrowings', label: 'Borrowings', icon: Package },
  { to: '/listings', label: 'Listings', icon: LayoutGrid },
]

export function StudentLayout() {
  const { pathname } = useLocation()

  /* Every navigation should start at the top of the new page. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden"
        aria-label="Bottom navigation"
      >
        <div className="grid grid-cols-6">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[0.625rem] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <t.icon className={cn('size-5', isActive && 'stroke-[2.3]')} />
                  {t.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
