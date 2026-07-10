import React from 'react';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { StaffLogin } from './pages/StaffLogin';
import { Dashboard } from './pages/Dashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { useAuth } from './context/AuthContext';
import { Routes, Route, Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={role === 'staff' ? '/staff/login' : '/login'} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'staff') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const App = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute role="student">
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/staff/dashboard" 
          element={
            <ProtectedRoute role="staff">
              <StaffDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/" 
          element={<RootRedirect />} 
        />
      </Routes>
    </div>
  );
};

export default App;