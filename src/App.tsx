import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuthStore } from './store/authStore';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { isSupabaseConfigured } from './lib/supabaseClient';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

// Lazy load pages for better initial load performance
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function SupabaseNotConfigured() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-aura-navy p-8 text-center">
      <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-5 border border-amber-500/20">
        <AlertTriangle size={32} className="text-amber-400" />
      </div>
      <h1 className="text-white font-bold text-lg mb-2">Configuration Required</h1>
      <p className="text-aura-lavender/40 text-sm mb-6 max-w-sm leading-relaxed">
        Supabase environment variables are missing. Please set <code className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded text-xs">VITE_SUPABASE_URL</code> and <code className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded text-xs">VITE_SUPABASE_ANON_KEY</code> in your <code className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded text-xs">.env</code> file.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-white rounded-xl font-semibold text-sm active:scale-95 transition-all shadow-md shadow-aura-primary/20"
      >
        <RefreshCw size={16} /> Retry
      </button>
    </div>
  );
}

export default function App() {
  const { token } = useAuthStore();
  const isOnline = useOnlineStatus();

  if (!isSupabaseConfigured) {
    return <SupabaseNotConfigured />;
  }

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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}
