import { Route, Routes } from 'react-router-dom'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'

import { LandingPage } from '@/pages/Landing'
import { DiscoverPage } from '@/pages/Discover'
import { AIFindPage } from '@/pages/AIFind'
import { ResourceDetailsPage } from '@/pages/ResourceDetails'
import { BorrowRequestPage } from '@/pages/BorrowRequest'
import { AgreementPage } from '@/pages/Agreement'
import { PaymentPage } from '@/pages/Payment'
import { HandoverPage } from '@/pages/Handover'
import { MyBorrowingsPage } from '@/pages/MyBorrowings'
import { BorrowingDetailsPage } from '@/pages/BorrowingDetails'
import { ReturnPage } from '@/pages/Return'
import { InspectionPage } from '@/pages/Inspection'
import { SettlementPage } from '@/pages/Settlement'
import { RatingPage } from '@/pages/Rating'
import { MyListingsPage } from '@/pages/MyListings'
import { NewListingPage } from '@/pages/NewListing'
import { ProfilePage } from '@/pages/Profile'
import { NotificationsPage } from '@/pages/Notifications'
import { MessagesPage } from '@/pages/Messages'
import { WantedBoardPage } from '@/pages/WantedBoard'
import { WishlistPage } from '@/pages/Wishlist'
import { LeaderboardPage } from '@/pages/Leaderboard'
import { CampusMapPage } from '@/pages/CampusMap'
import { ImpactPage } from '@/pages/Impact'
import { NotFoundPage } from '@/pages/NotFound'

import { AdminLoginPage } from '@/pages/admin/AdminLogin'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboard'
import { AdminUsersPage } from '@/pages/admin/AdminUsers'
import { AdminResourcesPage } from '@/pages/admin/AdminResources'
import { AdminExchangesPage } from '@/pages/admin/AdminExchanges'
import { AdminDisputesPage } from '@/pages/admin/AdminDisputes'
import { AdminTransactionsPage } from '@/pages/admin/AdminTransactions'
import { AdminImpactPage } from '@/pages/admin/AdminImpact'
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalytics'

export function App() {
  return (
    <Routes>
      {/* ── Student experience ─────────────────────────────── */}
      <Route element={<StudentLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/ai" element={<AIFindPage />} />
        <Route path="/map" element={<CampusMapPage />} />
        <Route path="/wanted" element={<WantedBoardPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/resource/:id" element={<ResourceDetailsPage />} />
        <Route path="/borrow/:resourceId" element={<BorrowRequestPage />} />

        <Route path="/borrowings" element={<MyBorrowingsPage />} />
        <Route path="/borrowings/:id" element={<BorrowingDetailsPage />} />
        <Route path="/borrowings/:id/agreement" element={<AgreementPage />} />
        <Route path="/borrowings/:id/payment" element={<PaymentPage />} />
        <Route path="/borrowings/:id/handover" element={<HandoverPage />} />
        <Route path="/borrowings/:id/return" element={<ReturnPage />} />
        <Route path="/borrowings/:id/inspection" element={<InspectionPage />} />
        <Route path="/borrowings/:id/settlement" element={<SettlementPage />} />
        <Route path="/borrowings/:id/rating" element={<RatingPage />} />

        <Route path="/listings" element={<MyListingsPage />} />
        <Route path="/listings/new" element={<NewListingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/impact" element={<ImpactPage />} />
      </Route>

      {/* ── Admin console ──────────────────────────────────── */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/resources" element={<AdminResourcesPage />} />
        <Route path="/admin/exchanges" element={<AdminExchangesPage />} />
        <Route path="/admin/disputes" element={<AdminDisputesPage />} />
        <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
        <Route path="/admin/impact" element={<AdminImpactPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
