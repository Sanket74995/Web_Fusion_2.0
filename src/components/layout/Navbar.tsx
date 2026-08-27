import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Compass,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  Shield,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { Avatar } from '@/components/common/Avatar'
import { Logo } from './Logo'

const LINKS = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/ai', label: 'AI Find', icon: Sparkles },
  { to: '/borrowings', label: 'My Borrowings', icon: Package },
  { to: '/listings', label: 'My Listings', icon: LayoutGrid },
]

export function Navbar() {
  const { state, currentUser, resetDemo } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const unread = state.notifications.filter((n) => !n.read).length

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 border-b transition-colors duration-200',
          scrolled
            ? 'border-border bg-background/85 backdrop-blur-md'
            : 'border-transparent bg-background',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <l.icon className="size-4" />
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              to="/notifications"
              className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
            >
              <Bell className="size-[1.125rem]" />
              {unread > 0 && (
                <span className="num absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.5625rem] font-bold leading-4 text-destructive-foreground">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            <Link
              to="/listings/new"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'hidden lg:inline-flex')}
            >
              List a resource
            </Link>

            <Link
              to="/profile"
              className="hidden items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted sm:inline-flex"
            >
              <Avatar user={currentUser} size="sm" />
              <span className="hidden text-[0.8125rem] font-medium lg:inline">
                {currentUser.name.split(' ')[0]}
              </span>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border bg-card md:hidden">
            <nav className="mx-auto max-w-7xl space-y-1 px-4 py-3" aria-label="Mobile">
              {LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-primary-soft text-primary' : 'text-muted-foreground',
                    )
                  }
                >
                  <l.icon className="size-4" />
                  {l.label}
                </NavLink>
              ))}
              <NavLink
                to="/profile"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground"
              >
                <UserIcon className="size-4" />
                Profile
              </NavLink>
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Link
                  to="/listings/new"
                  className={cn(buttonVariants({ size: 'sm' }), 'flex-1')}
                >
                  List a resource
                </Link>
                <Link
                  to="/admin/login"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1')}
                >
                  <Shield />
                  Admin
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo()
          setConfirmReset(false)
          toast({ title: 'Demo data reset', description: 'Everything is back to the seeded state.' })
          navigate('/')
        }}
        title="Reset demo data?"
        message="This clears every request, payment, return and rating created in this session and restores the original campus dataset."
        confirmLabel="Reset everything"
        tone="destructive"
      />

      {/* Floating utility rail — judge-facing shortcuts that stay out of the way. */}
      <div className="pointer-events-none fixed bottom-4 left-4 z-30 hidden lg:block">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Shield className="size-3.5" />
            Admin
          </Link>
          <span className="h-4 w-px bg-border" />
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset demo
          </button>
        </div>
      </div>
    </>
  )
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
              Everything you need may already be on campus. CampusLoop turns idle student
              resources into shared access — borrow it, use it, return it.
            </p>
            <Badge variant="outline" size="sm" className="mt-4">
              Built for WEBFUSION 2.0 · TSEC
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6 text-[0.8125rem] sm:grid-cols-3">
            <div>
              <p className="mb-2 font-semibold">Borrow</p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <Link to="/discover" className="hover:text-foreground">
                    Discover resources
                  </Link>
                </li>
                <li>
                  <Link to="/ai" className="hover:text-foreground">
                    AI requirement search
                  </Link>
                </li>
                <li>
                  <Link to="/borrowings" className="hover:text-foreground">
                    My borrowings
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-2 font-semibold">Share</p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <Link to="/listings/new" className="hover:text-foreground">
                    List a resource
                  </Link>
                </li>
                <li>
                  <Link to="/listings" className="hover:text-foreground">
                    My listings
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="hover:text-foreground">
                    Trust & profile
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-2 font-semibold">Platform</p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <Link to="/impact" className="hover:text-foreground">
                    Campus impact
                  </Link>
                </li>
                <li>
                  <Link to="/admin/login" className="hover:text-foreground">
                    Admin console
                  </Link>
                </li>
                <li>
                  <Link to="/notifications" className="hover:text-foreground">
                    Notifications
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-2xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            A frontend prototype — payments, verification and notifications are simulated in the
            browser.
          </p>
          <p className="inline-flex items-center gap-1.5">
            <LogOut className="size-3" />
            Signed in as a demo student account
          </p>
        </div>
      </div>
    </footer>
  )
}
