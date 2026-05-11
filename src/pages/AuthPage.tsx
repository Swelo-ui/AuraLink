import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { validateCredentials } from '../lib/authSecurity';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateCredentials(username, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username.trim());
      const authEmail = isEmail ? username.trim().toLowerCase() : `${username.trim().toLowerCase()}@auralink.app`;
      const displayUsername = isEmail ? username.trim().split('@')[0] : username.trim();

      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: password,
        });

        if (signInError) throw signInError;
        if (!data.session) throw new Error('No session returned');

        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const userToSet = existingUser || { id: data.user.id, username: displayUsername };

        if (!existingUser) {
          await supabase.from('users').insert([{ id: data.user.id, username: displayUsername }]);
        }

        setAuth(data.session.access_token, {
          id: userToSet.id,
          username: userToSet.username,
          avatarUrl: userToSet.avatar_url || undefined,
        });
        navigate('/dashboard');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password: password,
          options: {
            data: { username: displayUsername }
          }
        });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setSuccess('Account created! Check your email to verify, then sign in.');
          setLoading(false);
          return;
        }

        const { error: profileError } = await supabase.from('users').upsert([
          { id: data.user!.id, username: displayUsername }
        ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Auto-connect with AuraBot
        const { data: botData } = await supabase
          .from('users')
          .select('id')
          .eq('username', 'AuraBot')
          .single();

        if (botData) {
          await supabase.from('connections').insert([
            { user1_id: data.user!.id, user2_id: botData.id, status: 'accepted' }
          ]);
        }

        setAuth(data.session.access_token, { id: data.user!.id, username: displayUsername });
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      // Friendlier error messages
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect username or password. Please try again.');
      } else if (msg.includes('User already registered')) {
        setError('This account already exists. Try signing in instead.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [username, password, isLogin, setAuth, navigate]);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(155,89,182,0.25) 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, rgba(236,72,153,0.2) 0%, transparent 55%), #0D0D1A'
      }}
    >
      {/* Ambient background effects */}
      <div className="absolute top-[-80px] left-[-80px] w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #9B59B6, transparent)' }} />
      <div className="absolute bottom-[-80px] right-[-60px] w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #EC4899, transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div
          className="rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl backdrop-blur-sm"
          style={{ background: 'rgba(26,26,46,0.9)' }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <motion.div
              whileHover={{ rotate: 6, scale: 1.05 }}
              className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#9B59B6] to-[#EC4899] shadow-[0_0_40px_rgba(236,72,153,0.4)]"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E9D5FF] to-white">
              AuraLink
            </h1>
            <p className="text-xs text-aura-lavender/40 uppercase tracking-[0.2em] font-bold">
              Chat · Connect · Closer
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-aura-navy rounded-xl p-1 mb-6 border border-aura-border">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-aura-primary text-white shadow-lg shadow-aura-primary/20' : 'text-aura-lavender/50 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-aura-primary text-white shadow-lg shadow-aura-primary/20' : 'text-aura-lavender/50 hover:text-white'}`}
            >
              Register
            </button>
          </div>

          {/* Error/Success Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 text-red-400 p-3 rounded-xl mb-4 text-sm border border-red-500/20"
                role="alert"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-500/10 text-green-400 p-3 rounded-xl mb-4 text-sm border border-green-500/20"
                role="status"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="auth-username"
                className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-aura-lavender/50"
              >
                {isLogin ? 'Username or Email' : 'Choose a Username'}
              </label>
              <input
                type="text"
                id="auth-username"
                className="w-full rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all border bg-aura-navy border-aura-border focus:border-aura-primary focus:ring-1 focus:ring-aura-primary/30"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={isLogin ? 'username or email@example.com' : 'your_username'}
                minLength={3}
                maxLength={50}
                autoComplete="username"
                autoCapitalize="off"
                spellCheck={false}
                required
                disabled={loading}
              />
              {!isLogin && (
                <p className="text-[10px] text-aura-lavender/30 mt-1 px-1">
                  3-24 characters, letters, numbers, and underscores only
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-aura-lavender/50"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="auth-password"
                  className="w-full rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none transition-all border bg-aura-navy border-aura-border focus:border-aura-primary focus:ring-1 focus:ring-aura-primary/30"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  maxLength={128}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-aura-lavender/40 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-[10px] text-aura-lavender/30 mt-1 px-1">
                  Minimum 8 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-aura-primary to-aura-pink shadow-lg shadow-aura-primary/30 hover:shadow-aura-primary/50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[11px] text-aura-lavender/30 mt-6">
            By continuing, you agree to AuraLink's Terms of Service
          </p>
        </div>
      </motion.div>
    </div>
  );
}
