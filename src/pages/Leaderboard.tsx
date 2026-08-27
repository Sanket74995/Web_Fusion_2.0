import { useState } from 'react'
import { Trophy, Coins, Sparkles } from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { num } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Avatar } from '@/components/common/Avatar'
import { Reveal, Stagger, StaggerItem } from '@/components/common/Motion'

const PERKS = [
  {
    id: 'p1',
    title: 'Zero Platform Fee Voucher',
    desc: 'Waives 100% of the platform fee on your next borrow or listing payout.',
    cost: 250,
    badge: '1 Exchange Free',
  },
  {
    id: 'p2',
    title: 'Featured Listing Boost',
    desc: 'Pins your listed resource to the top of Discover for 7 days.',
    cost: 400,
    badge: '7 Days Top Rank',
  },
  {
    id: 'p3',
    title: '₹100 Security Deposit Waiver',
    desc: 'Reduces the deposit requirement on your next borrowing by ₹100.',
    cost: 300,
    badge: 'Deposit Savings',
  },
  {
    id: 'p4',
    title: 'Fast-Track Verification Badge',
    desc: 'Instant profile trust score boost (+5) and Verified Sharer status.',
    cost: 500,
    badge: '+5 Trust Points',
  },
]

export function LeaderboardPage() {
  const { state, currentUser, redeemPerk } = useStore()
  const [tab, setTab] = useState<'rankings' | 'rewards'>('rankings')

  // Rank users by coins & trustScore
  const rankedUsers = [...state.users].sort(
    (a, b) => (b.coins ?? 0) * 2 + b.trustScore * 5 - ((a.coins ?? 0) * 2 + a.trustScore * 5),
  )

  const myRank = rankedUsers.findIndex((u) => u.id === currentUser.id) + 1

  return (
    <Page>
      <PageHeader
        eyebrow={<span className="text-sm text-muted-foreground">Gamified Sharing</span>}
        title="Leaderboard & CampusCoins"
        subtitle="Earn CampusCoins by sharing resources, returning items on time, and building trust."
      />

      {/* Wallet Banner */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-card p-6 shadow-sm mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Coins className="size-7" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your Balance
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="num text-3xl font-extrabold tracking-tight">
                    {num(currentUser.coins ?? 0)}
                  </span>
                  <span className="text-sm font-semibold text-primary">CampusCoins</span>
                </div>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  Ranked #{myRank} of {rankedUsers.length} active campus sharers
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={tab === 'rankings' ? 'primary' : 'outline'}
                onClick={() => setTab('rankings')}
              >
                <Trophy className="size-4" />
                Leaderboard
              </Button>
              <Button
                variant={tab === 'rewards' ? 'primary' : 'outline'}
                onClick={() => setTab('rewards')}
              >
                <Sparkles className="size-4" />
                Redeem Rewards
              </Button>
            </div>
          </div>
        </div>
      </Reveal>

      {tab === 'rankings' ? (
        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          {/* Rankings Table */}
          <Reveal>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle
                  title="Campus Sharer Rankings"
                  hint="Top members based on trust score, completed exchanges, and earned coins"
                />

                <div className="mt-4 divide-y divide-border">
                  {rankedUsers.map((u, i) => {
                    const isMe = u.id === currentUser.id
                    return (
                      <div
                        key={u.id}
                        className={cn(
                          'flex items-center justify-between gap-3 py-3.5 px-2 transition-colors rounded-lg',
                          isMe && 'bg-primary-soft/40 border border-primary/20',
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={cn(
                              'num inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                              i === 0 && 'bg-amber-400 text-amber-950',
                              i === 1 && 'bg-slate-300 text-slate-900',
                              i === 2 && 'bg-amber-700 text-amber-100',
                              i > 2 && 'bg-muted text-muted-foreground',
                            )}
                          >
                            {i + 1}
                          </span>

                          <Avatar user={u} size="sm" />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold flex items-center gap-1.5">
                              {u.name}
                              {isMe && (
                                <Badge variant="outline" size="sm" className="text-[0.625rem]">
                                  You
                                </Badge>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {u.department} · {u.successfulExchanges} exchanges
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 text-right">
                          <div>
                            <p className="num text-xs font-bold text-foreground">
                              {num(u.coins ?? 0)} coins
                            </p>
                            <p className="text-2xs text-muted-foreground">
                              Trust: {u.trustScore}/100
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* How to Earn Side Card */}
          <Reveal delay={0.1}>
            <Card>
              <CardContent className="pt-5 space-y-4">
                <SectionTitle title="How to Earn Coins" hint="Automatic rewards for good habits" />

                <ul className="space-y-3 text-xs">
                  <li className="flex gap-3">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-2xs">
                      +50
                    </span>
                    <div>
                      <p className="font-semibold">Complete On-Time Return</p>
                      <p className="text-muted-foreground text-2xs">
                        Return borrowed gear before deadline with clean inspection.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-2xs">
                      +100
                    </span>
                    <div>
                      <p className="font-semibold">List a High-Demand Item</p>
                      <p className="text-muted-foreground text-2xs">
                        List a camera, laptop or lab tool that gets approved.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-2xs">
                      +30
                    </span>
                    <div>
                      <p className="font-semibold">Get a 5-Star Exchange Review</p>
                      <p className="text-muted-foreground text-2xs">
                        Maintain high ratings from students you exchange with.
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      ) : (
        /* Rewards Store */
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((perk) => {
            const canAfford = (currentUser.coins ?? 0) >= perk.cost

            return (
              <StaggerItem key={perk.id}>
                <Reveal>
                  <Card className="h-full flex flex-col justify-between">
                    <CardContent className="pt-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="primary" size="sm">
                            {perk.badge}
                          </Badge>
                          <span className="num text-xs font-extrabold text-primary flex items-center gap-1">
                            <Coins className="size-3.5" />
                            {perk.cost}
                          </span>
                        </div>

                        <h3 className="mt-3 text-sm font-semibold">{perk.title}</h3>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          {perk.desc}
                        </p>
                      </div>

                      <div className="mt-6 pt-3 border-t border-border">
                        <Button
                          disabled={!canAfford}
                          onClick={() => redeemPerk(perk.title, perk.cost)}
                          className="w-full text-xs"
                          variant={canAfford ? 'primary' : 'outline'}
                        >
                          {canAfford ? 'Redeem Voucher' : 'Not Enough Coins'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Reveal>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </Page>
  )
}
