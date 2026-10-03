import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkshopAuthProvider } from './context/WorkshopAuthContext';
import { RunnerAuthProvider } from './context/RunnerAuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import TopNavBar from './components/TopNavBar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import BookingWizard from './pages/BookingWizard';
import OrderTracking from './pages/OrderTracking';
import CustomerDashboard from './pages/CustomerDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import WorkshopPortal from './pages/WorkshopPortal';
import WorkshopLogin from './pages/WorkshopLogin';
import RunnerPortal from './pages/RunnerPortal';
import RunnerLogin from './pages/RunnerLogin';
import AdminPortal from './pages/AdminPortal';
import AdminLogin from './pages/AdminLogin';
import InvoicePage from './pages/InvoicePage';
import HardwareDiagnostic from './pages/HardwareDiagnostic';
import RewardsHub from './pages/RewardsHub';

// Scroll to top helper on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
}

// Protected Route helper for customer dashboard
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#d97706', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Authenticating your session...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, we still let them explore or redirect them gracefully with demo option
  return children;
}

import LiveChatWidget from './components/LiveChatWidget';
import WhatsAppSmsSimulator from './components/WhatsAppSmsSimulator';

function AppContent() {
  const location = useLocation();
  const isWorkshopRoute = location.pathname.startsWith('/workshop');
  const isRunnerRoute = location.pathname.startsWith('/runner') || location.pathname.startsWith('/partner');
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStandaloneRoute = isWorkshopRoute || isRunnerRoute || isAdminRoute;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: isStandaloneRoute ? '#090d16' : 'var(--bg-main)'
    }}>
      <ScrollToTop />
      {!isStandaloneRoute && <TopNavBar />}
      
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<BookingWizard />} />
          <Route path="/diagnose" element={<HardwareDiagnostic />} />
          <Route path="/track" element={<OrderTracking />} />
          <Route path="/track/:orderId" element={<OrderTracking />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <CustomerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/rewards" 
            element={
              <ProtectedRoute>
                <RewardsHub />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/workshop" element={<WorkshopPortal />} />
          <Route path="/workshop/login" element={<WorkshopLogin />} />
          <Route path="/runner" element={<RunnerPortal />} />
          <Route path="/runner/login" element={<RunnerLogin />} />
          <Route path="/partner" element={<RunnerPortal />} />
          <Route path="/partner/login" element={<RunnerLogin />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/invoice/:orderId" element={<InvoicePage />} />
          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isStandaloneRoute && <Footer />}
      {!isStandaloneRoute && <LiveChatWidget />}
      <WhatsAppSmsSimulator />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkshopAuthProvider>
        <RunnerAuthProvider>
          <AdminAuthProvider>
            <Router>
              <AppContent />
            </Router>
          </AdminAuthProvider>
        </RunnerAuthProvider>
      </WorkshopAuthProvider>
    </AuthProvider>
  );
}
