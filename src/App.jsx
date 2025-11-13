import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserAccounts from './pages/UserAccounts';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/user-accounts" element={<UserAccounts />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
