import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import SessionTimeoutNotifier from './components/SessionTimeoutNotifier';
import { GlobalBarcodeScannerProvider } from './contexts/GlobalBarcodeScannerContext';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UserAccounts = lazy(() => import('./pages/UserAccounts'));
const Profile = lazy(() => import('./pages/Profile'));
const Invoices = lazy(() => import('./pages/Invoices'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const ViewInvoice = lazy(() => import('./pages/ViewInvoice'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));
const InvoiceTemplates = lazy(() => import('./pages/InvoiceTemplates'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const CompanySettings = lazy(() => import('./pages/CompanySettings'));
const SalesCharts = lazy(() => import('./pages/SalesCharts'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Statistics = lazy(() => import('./pages/Statistics'));
const SalesAnalytics = lazy(() => import('./pages/SalesAnalytics'));
const Blacklist = lazy(() => import('./pages/Blacklist'));

// Loading fallback component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
    <Spin size="large" />
  </div>
);

function App() {
  return (
    <>
      <GlobalBarcodeScannerProvider>
        <SessionTimeoutNotifier />
        <Suspense fallback={<PageLoader />}>
          <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Public Invoice - No authentication required */}
      <Route path="/i/:token" element={<PublicInvoice />} />

      {/* Protected Routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/user-accounts" 
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin', 'super_admin']}>
              <UserAccounts />
            </RoleRoute>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/invoices" 
        element={
          <ProtectedRoute>
            <Invoices />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/invoices/create" 
        element={
          <ProtectedRoute>
            <CreateInvoice />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/invoices/edit/:invoiceNumber" 
        element={
          <ProtectedRoute>
            <CreateInvoice mode="edit" />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/invoice/:invoiceNumber" 
        element={
          <ProtectedRoute>
            <ViewInvoice />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/invoice-templates" 
        element={
          <ProtectedRoute>
            <InvoiceTemplates />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/activity-logs" 
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['super_admin']}>
              <ActivityLogs />
            </RoleRoute>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/company-settings" 
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['super_admin']}>
              <CompanySettings />
            </RoleRoute>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/sales-charts" 
        element={
          <ProtectedRoute>
            <SalesCharts />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/sales-charts/overview" 
        element={
          <ProtectedRoute>
            <SalesCharts />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/sales-charts/statistics" 
        element={
          <ProtectedRoute>
            <Statistics />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/sales-charts/sales-analytics" 
        element={
          <ProtectedRoute>
            <SalesAnalytics />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/sales-charts/analytics" 
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/blacklist" 
        element={
          <ProtectedRoute>
            <Blacklist />
          </ProtectedRoute>
        } 
      />

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </GlobalBarcodeScannerProvider>
    </>
  );
}

export default App;
