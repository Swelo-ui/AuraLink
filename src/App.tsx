/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { token } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />} />
        <Route path="/auth" element={token ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/dashboard/*" element={token ? <Dashboard /> : <Navigate to="/auth" />} />
      </Routes>
    </Router>
  );
}
