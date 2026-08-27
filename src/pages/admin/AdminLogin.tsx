import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { ADMIN_CREDENTIALS, useStore } from '@/store/AppStore'
import { platformStats } from '@/services/analytics'
import { num } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { PageTransition } from '@/components/common/Motion'
import { Logo } from '@/components/layout/Logo'

export function AdminLoginPage() {
  const { state, adminLogin } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (state.adminSession) return <Navigate to="/admin" replace />

  const stats = platformStats(state)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    // Simulated auth — credentials are checked in the store, no server involved.
    window.setTimeout(() => {
      const ok = adminLogin(email.trim(), password)
      setSubmitting(false)
      if (!ok) {
        setError('Those credentials do not match a moderator account.')
        return
      }
      toast({
        title: 'Signed in as moderator',
        description: 'You have access to users, listings, disputes and settlements.',
        tone: 'success',
      })
      navigate('/admin')
    }, 620)
  }

  const fillDemo = () => {
    setEmail(ADMIN_CREDENTIALS.email)
    setPassword(ADMIN_CREDENTIALS.password)
    setError('')
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
        {/* Form */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <Logo />

            <Badge variant="primary" size="sm" className="mt-8">
              <ShieldCheck className="size-3" />
              Moderator access
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Admin console</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Approve listings, monitor exchanges and resolve disputes for CampusLoop at TSEC.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <Field label="Moderator email" required>
                {(id) => (
                  <Input
                    id={id}
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@campusloop.in"
                  />
                )}
              </Field>
              <Field label="Password" required>
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                )}
              </Field>

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2.5 text-xs font-medium text-destructive"
                >
                  <AlertCircle className="mt-px size-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" loading={submitting}>
                <Lock />
                Sign in
                <ArrowRight />
              </Button>
            </form>

            <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 p-3.5">
              <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                <KeyRound className="size-3.5" />
                Demo credentials
              </p>
              <div className="num mt-2 space-y-0.5 text-xs">
                <p>
                  <span className="text-muted-foreground">Email</span>{' '}
                  <span className="font-medium">{ADMIN_CREDENTIALS.email}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Password</span>{' '}
                  <span className="font-medium">{ADMIN_CREDENTIALS.password}</span>
                </p>
              </div>
              <Button variant="soft" size="sm" className="mt-2.5" onClick={fillDemo}>
                Fill them in
              </Button>
              <p className="mt-2.5 text-2xs leading-relaxed text-muted-foreground">
                Authentication is simulated in the browser for this prototype — there is no auth
                server and nothing leaves the device.
              </p>
            </div>

            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back to the student experience
            </Link>
          </div>
        </div>

        {/* Context panel */}
        <div className="relative hidden overflow-hidden bg-ink px-14 py-16 text-white lg:flex lg:flex-col lg:justify-center">
          <div
            className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, hsl(168 62% 52%), transparent 68%)' }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, hsl(214 70% 58%), transparent 70%)' }}
            aria-hidden
          />
          <div className="relative max-w-md">
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-white/50">
              CampusLoop · TSEC
            </p>
            <p className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
              A campus does not need more stuff. It needs a way to reach what it already owns.
            </p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/70">
              The console is where trust is kept honest — listings reviewed, deadlines watched,
              deposits released, disputes settled with evidence from both sides.
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-6">
              {[
                { label: 'Members', value: num(stats.activeMembers) },
                { label: 'Resources', value: num(stats.resourcesShared) },
                { label: 'Exchanges', value: num(stats.successfulExchanges) },
              ].map((s) => (
                <div key={s.label}>
                  <dd className="num text-2xl font-semibold tracking-tight">{s.value}</dd>
                  <dt className="mt-0.5 text-2xs text-white/55">{s.label}</dt>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-2xs text-white/55">
              <span>{stats.pendingApprovals} listings awaiting review</span>
              <span>{stats.openDisputes} open disputes</span>
              <span>{stats.overdueCount} overdue returns</span>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
