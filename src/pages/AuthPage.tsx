import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      setAuth(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(155,89,182,0.25) 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, rgba(236,72,153,0.2) 0%, transparent 55%), #0D0D1A' }}
    >
      {/* Ambient blobs */}
      <div className="absolute top-[-80px] left-[-80px] w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #9B59B6, transparent)' }} />
      <div className="absolute bottom-[-80px] right-[-60px] w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #EC4899, transparent)' }} />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="rounded-3xl p-8 border border-white/10 shadow-2xl backdrop-blur-sm"
          style={{ background: 'rgba(26,26,46,0.85)' }}
        >
          {/* Icon + Logo stacked */}
          <div className="flex flex-col items-center mb-6 gap-0">
            {/* Kawaii icon */}
            <img
              src="/auralink-icon.jpeg"
              alt="AuraLink Icon"
              className="w-24 h-24 object-contain mix-blend-screen"
            />
            {/* Text logo */}
            <img
              src="/auralink-logo.jpeg"
              alt="AuraLink – chat · connect · closer"
              className="h-14 object-contain mix-blend-screen"
              style={{ filter: 'drop-shadow(0 2px 12px rgba(155,89,182,0.4))' }}
            />
          </div>

          {/* Subtitle */}
          <p className="text-center text-sm mb-7" style={{ color: 'rgba(233,213,255,0.55)' }}>
            {isLogin ? '✨ Welcome back! Your aura awaits.' : '🌟 Join AuraLink — study together, closer.'}
          </p>

          {error && (
            <div className="bg-red-500/15 text-red-400 p-3 rounded-xl mb-5 text-sm border border-red-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(233,213,255,0.5)' }}>
                Username
              </label>
              <input
                type="text"
                id="auth-username"
                className="w-full rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none transition-all border"
                style={{ background: 'rgba(13,13,26,0.8)', borderColor: 'rgba(155,89,182,0.3)' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#9B59B6')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(155,89,182,0.3)')}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your_username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(233,213,255,0.5)' }}>
                Password
              </label>
              <input
                type="password"
                id="auth-password"
                className="w-full rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none transition-all border"
                style={{ background: 'rgba(13,13,26,0.8)', borderColor: 'rgba(155,89,182,0.3)' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#9B59B6')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(155,89,182,0.3)')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              id="auth-submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm mt-2 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #9B59B6 0%, #EC4899 100%)', boxShadow: '0 4px 24px rgba(155,89,182,0.4)' }}
            >
              {loading ? '✨ Connecting...' : isLogin ? 'Sign In 🚀' : 'Create Account 🌸'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              id="auth-toggle"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-xs transition-colors"
              style={{ color: 'rgba(233,213,255,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#EC4899')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(233,213,255,0.5)')}
            >
              {isLogin ? "Don't have an account? Register →" : 'Already have an account? Sign in →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
