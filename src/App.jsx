import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import UserAccounts from './pages/UserAccounts';
import Profile from './pages/Profile';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import ViewInvoice from './pages/ViewInvoice';
import PublicInvoice from './pages/PublicInvoice';
import InvoiceTemplates from './pages/InvoiceTemplates';
import ActivityLogs from './pages/ActivityLogs';

function App() {
  return (
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

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
