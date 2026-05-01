/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { token } = useAuthStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Router>
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white p-2 flex items-center justify-center gap-2 text-sm font-semibold shadow-md"
          >
            <WifiOff size={16} />
            You are offline. AuraLink is running in cached mode.
          </motion.div>
        )}
      </AnimatePresence>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />} />
        <Route path="/auth" element={token ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/dashboard/*" element={token ? <Dashboard /> : <Navigate to="/auth" />} />
      </Routes>
    </Router>
  );
}
