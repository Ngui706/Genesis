import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ChangePassword from './pages/ChangePassword';
import SearchResults from './pages/SearchResults';
import SeatSelection from './pages/SeatSelection';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingHistory from './pages/BookingHistory';

import StaffLayout from './pages/staff/StaffLayout';
import StaffHome from './pages/staff/StaffHome';
import StaffBranch from './pages/staff/StaffBranch';
import StaffBuses from './pages/staff/StaffBuses';
import StaffRoutes from './pages/staff/StaffRoutes';
import StaffSchedules from './pages/staff/StaffSchedules';
import StaffPromos from './pages/staff/StaffPromos';
import StaffRevenue from './pages/staff/StaffRevenue';
import StaffCustomers from './pages/staff/StaffCustomers';
import StaffNews from './pages/staff/StaffNews';
import StaffBoarding from './pages/staff/StaffBoarding';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageBranches from './pages/admin/ManageBranches';
import ManageBuses from './pages/admin/ManageBuses';
import ManageRoutes from './pages/admin/ManageRoutes';
import ManageSchedules from './pages/admin/ManageSchedules';
import ManageStaff from './pages/admin/ManageStaff';
import ManageCustomers from './pages/admin/ManageCustomers';
import PromoCodes from './pages/admin/PromoCodes';
import Refunds from './pages/admin/Refunds';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import AuditLogs from './pages/admin/AuditLogs';
import ManagePopularRoutes from './pages/admin/ManagePopularRoutes';
import ManageFeaturedBranches from './pages/admin/ManageFeaturedBranches';
import ManageBranchUpdates from './pages/admin/ManageBranchUpdates';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-midnight">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/select-seats/:scheduleId" element={<SeatSelection />} />

          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
          <Route path="/booking-confirmation/:bookingId" element={<ProtectedRoute><BookingConfirmation /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingHistory /></ProtectedRoute>} />

          {/* Staff Portal */}
          <Route path="/staff" element={<ProtectedRoute roles={['staff', 'admin']}><StaffLayout /></ProtectedRoute>}>
            <Route index element={<StaffHome />} />
            <Route path="branch" element={<StaffBranch />} />
            <Route path="buses" element={<StaffBuses />} />
            <Route path="routes" element={<StaffRoutes />} />
            <Route path="schedules" element={<StaffSchedules />} />
            <Route path="promo-codes" element={<StaffPromos />} />
            <Route path="revenue" element={<StaffRevenue />} />
            <Route path="customers" element={<StaffCustomers />} />
            <Route path="news" element={<StaffNews />} />
            <Route path="boarding" element={<StaffBoarding />} />
          </Route>

          {/* Admin Portal */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="branches" element={<ManageBranches />} />
            <Route path="buses" element={<ManageBuses />} />
            <Route path="routes" element={<ManageRoutes />} />
            <Route path="schedules" element={<ManageSchedules />} />
            <Route path="staff" element={<ManageStaff />} />
            <Route path="customers" element={<ManageCustomers />} />
            <Route path="promo-codes" element={<PromoCodes />} />
            <Route path="refunds" element={<Refunds />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="popular-routes" element={<ManagePopularRoutes />} />
            <Route path="featured-branches" element={<ManageFeaturedBranches />} />
            <Route path="branch-updates" element={<ManageBranchUpdates />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl font-bold text-amber">404</p>
      <p className="mt-2 text-slate">This road doesn't lead anywhere. Let's get you back on route.</p>
      <a href="/" className="btn-primary mt-6">Back home</a>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-midnight-2">
      <div className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-slate">
        <p className="font-display text-cream">GENESIS <span className="text-amber">COACHES</span></p>
        <p className="mt-1">Beyond your Imagination</p>
        <p className="mt-4 text-xs text-slate-dim">© {new Date().getFullYear()} Genesis Coaches. All rights reserved.</p>
      </div>
    </footer>
  );
}
