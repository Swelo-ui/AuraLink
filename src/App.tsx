import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuthStore } from './store/authStore';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

// Lazy load pages for better initial load performance
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

export default function App() {
  const { token } = useAuthStore();
  const isOnline = useOnlineStatus();

  return (
    <ErrorBoundary>
      <Router>
        {/* Offline Banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-red-600 to-orange-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg"
              role="alert"
              aria-live="assertive"
            >
              <WifiOff size={16} />
              <span>You're offline. Some features may be limited.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Routes */}
        <Suspense fallback={<LoadingScreen message="Loading AuraLink..." />}>
          <Routes>
            <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />} />
            <Route path="/auth" element={token ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
            <Route path="/dashboard/*" element={token ? <Dashboard /> : <Navigate to="/auth" replace />} />
            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}
