import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Gauge,
  Leaf,
  LogOut,
  Menu,
  Package,
  Receipt,
  RefreshCcw,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { platformStats } from '@/services/analytics'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { Logo } from './Logo'

export function AdminLayout() {
  const { state, adminLogout } = useStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const stats = platformStats(state)

  const links = [
    { to: '/admin', label: 'Dashboard', icon: Gauge, end: true },
    { to: '/admin/users', label: 'Users', icon: Users, count: state.users.length },
    {
      to: '/admin/resources',
      label: 'Resources',
      icon: Package,
      count: stats.pendingApprovals || undefined,
      alert: stats.pendingApprovals > 0,
    },
    { to: '/admin/exchanges', label: 'Exchanges', icon: RefreshCcw, count: stats.activeExchanges },
    {
      to: '/admin/disputes',
      label: 'Disputes',
      icon: ShieldAlert,
      count: stats.openDisputes || undefined,
      alert: stats.openDisputes > 0,
    },
    { to: '/admin/transactions', label: 'Transactions', icon: Receipt },
    { to: '/admin/impact', label: 'Impact', icon: Leaf },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ]

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  if (!state.adminSession) return <Navigate to="/admin/login" replace />

  const nav = (
    <nav className="space-y-0.5" aria-label="Admin sections">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-colors duration-150',
              isActive
                ? 'bg-primary-soft text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <l.icon className="size-4 shrink-0" />
          <span className="flex-1">{l.label}</span>
          {l.count !== undefined && (
            <Badge variant={l.alert ? 'danger' : 'neutral'} size="sm" className="num">
              {l.count}
            </Badge>
          )}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close admin menu' : 'Open admin menu'}
          >
            {open ? <X /> : <Menu />}
          </Button>
          <Logo to="/admin" />
          <Badge variant="ink" size="sm" className="hidden sm:inline-flex">
            Admin console
          </Badge>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Student view</span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                adminLogout()
                navigate('/admin/login')
              }}
            >
              <LogOut />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        {open && <div className="border-t border-border bg-card px-4 py-3 lg:hidden">{nav}</div>}
      </header>

      <div className="mx-auto flex max-w-[95rem] gap-8 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            {nav}
            <div className="mt-6 rounded-xl border border-border bg-muted/40 p-3.5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Needs attention
              </p>
              <ul className="mt-2 space-y-1.5 text-xs">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Pending listings</span>
                  <span className="num font-semibold">{stats.pendingApprovals}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Open disputes</span>
                  <span className="num font-semibold">{stats.openDisputes}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Overdue returns</span>
                  <span className="num font-semibold">{stats.overdueCount}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Flagged items</span>
                  <span className="num font-semibold">{stats.flaggedResources}</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
