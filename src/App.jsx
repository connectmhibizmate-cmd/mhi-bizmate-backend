import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// App pages
import Splash from '@/pages/Splash';
import Home from '@/pages/Home';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/CustomerDetail';
import Products from '@/pages/Products';
import Orders from '@/pages/Orders';
import OrderNew from '@/pages/OrderNew';
import More from '@/pages/More';
import Analytics from '@/pages/Analytics';
import Notifications from '@/pages/Notifications';
import BusinessProfile from '@/pages/BusinessProfile';
import ProfileSettings from '@/pages/ProfileSettings';
import MyProfile from '@/pages/MyProfile';
import EditProfile from '@/pages/EditProfile';
import Accounting from '@/pages/Accounting';
import Sourcing from '@/pages/Sourcing';
import Marketing from '@/pages/Marketing';
import Reports from '@/pages/Reports';
import AskBizMate from '@/pages/AskBizMate';
import Automation from '@/pages/Automation';
import FacebookConnection from '@/pages/FacebookConnection';
import FacebookProductPost from '@/pages/FacebookProductPost';
import Inbox from '@/pages/Inbox';
import FacebookCallback from '@/pages/facebook-callback';
import Subscription from '@/pages/Subscription';
import WorkspaceTeam from '@/pages/WorkspaceTeam';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import DataDeletion from '@/pages/DataDeletion';
import AdminRoute from '@/components/AdminRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminUserView from '@/pages/AdminUserView';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminInbox from '@/pages/admin/AdminInbox';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminSubscriptionsBilling from '@/pages/admin/AdminSubscriptionsBilling';
import AdminAiEmployees from '@/pages/admin/AdminAiEmployees';
import AdminAiGateway from '@/pages/admin/AdminAiGateway';
import AdminKnowledge from '@/pages/admin/AdminKnowledge';
import AdminAutomations from '@/pages/admin/AdminAutomations';
import AdminMeta from '@/pages/admin/AdminMeta';
import AdminSystemHealth from '@/pages/admin/AdminSystemHealth';
import AdminAuditLogs from '@/pages/admin/AdminAuditLogs';
import AdminTeam from '@/pages/admin/AdminTeam';
import AdminSettings from '@/pages/admin/AdminSettings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/data-deletion" element={<DataDeletion />} />
      <Route path="/facebook-callback" element={<FacebookCallback />} />

      {/* Protected app */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/new" element={<OrderNew />} />
          <Route path="/more" element={<More />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/sourcing" element={<Sourcing />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/ask-bizmate" element={<AskBizMate />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/facebook-connection" element={<FacebookConnection />} />
          <Route path="/facebook-product-post" element={<FacebookProductPost />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/workspace-team" element={<WorkspaceTeam />} />
          <Route path="/admin/subscriptions" element={<Navigate to="/admin-panel/subscriptions" replace />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/business-profile" element={<BusinessProfile />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="/profile" element={<EditProfile />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/admin-panel" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="inbox" element={<AdminInbox />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:userId" element={<AdminUserView />} />
            <Route path="subscriptions" element={<AdminSubscriptionsBilling />} />
            <Route path="ai-employees" element={<AdminAiEmployees />} />
            <Route path="ai-gateway" element={<AdminAiGateway />} />
            <Route path="knowledge" element={<AdminKnowledge />} />
            <Route path="automations" element={<AdminAutomations />} />
            <Route path="meta" element={<AdminMeta />} />
            <Route path="system-health" element={<AdminSystemHealth />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="team" element={<AdminTeam />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App